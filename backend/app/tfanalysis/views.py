from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser

# from .models import Experiment, DefaultProcessingSettings, ProcessingSettings, ProcessedDsfData
# from .serializers import ExperimentSerializer, , ProcessingSettingsSerializer, ProcessedDsfDataSerializer

from .parsers import *

from .models import Parsers, Experiments, InstrumentInfo, RawData, SampleInfo, DefaultTransitionProcessingSettings, TransitionProcessingSettings, ProcessedTransitionData, DefaultPeakFindingSettings, PeakFindingSettings, PeakData
from .serializers import ParsersSerializer, ExperimentsSerializer, SampleInfoSerializer, TransitionProcessingSettingsSerializer, ProcessedTransitionDataSerializer, PeakFindingSettingsSerializer, PeakDataSerializer

from .processors import TransitionProcessor, PeakFindingProcessor


from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import time
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import connections
import io
import datetime
from django.utils import timezone

import pandas as pd
import json
import os

# TODO: auto_now fields are not honoured with .update method; need to save manually
# TODO: to be fair, only the experiment needs auto_now field, which could be saved everytime a change is made
# TODO I'm only interested in when the experiment was actually fiddled with last
# for item in my_queryset:
#     item.save()


class FetchParsers(APIView):

    def get(self, request):
        parsers = Parsers.objects.all()
        serialised = ParsersSerializer(parsers, many=True)
        return JsonResponse(serialised.data, safe=False, status=status.HTTP_200_OK)


class UploadData(APIView):

    def post(self, request):
        file_objs = request.FILES.getlist('files')
        paths = []
        for file_obj in file_objs:
            path = default_storage.save(file_obj.name, ContentFile(file_obj.read()))
            paths.append(settings.MEDIA_ROOT + path)

        try:
            # Use the selected parser on all uploaded files
            constructor = globals()[request.POST.get('parser')]
            data = constructor(paths)
            [os.remove(i) for i in paths]  # Cleanup files

            parser_validator = ParserValidator(data)
            if not parser_validator.is_valid:
                return JsonResponse({'message': 'Parser returned invalid data:', 'info': parser_validator.errors}, status=400)

        except Exception as E:
            [os.remove(i) for i in paths]  # Cleanup files
            return JsonResponse({'message': 'Parser failed with following error:', 'info': [str(E)]}, status=400)

        parser = Parsers.objects.filter(python_class_name=request.POST.get('parser'))[0]

        experiment = Experiments(
            parser=parser,
            name=request.POST.get('name'),
            project=request.POST.get('project'),
            user=request.POST.get('user'),
            notes=request.POST.get('notes'),
            instrument_info=json.dumps(data.instrument_info) if hasattr(data, 'instrument_info') else json.dumps({}),
            parse_warnings=json.dumps(data.warnings) if hasattr(data, 'warnings') else json.dumps({}),
        )
        experiment.save()

        if hasattr(data, 'instrument_info'):
            instrument_info = InstrumentInfo(
                experiment=experiment,
                data_json=json.dumps(data.instrument_info),
            )
            instrument_info.save()

        bulk = []
        for index, row in data.df.iterrows():
            temp_obj = RawData(
                experiment=experiment,
                data_type=row['data_type'],
                pos=row['pos'],
                col_index=row['col_index'],
                row_index=row['row_index'],
                raw_x=row['raw_x'].tolist(),
                raw_y=row['raw_y'].tolist(),
            )
            bulk.append(temp_obj)

        RawData.objects.bulk_create(bulk)

        imported_raw_data_ids = list(RawData.objects.filter(experiment=experiment.id).values_list('pos', 'id'))
        data.df['raw_data_id'] = data.df['pos'].map({k: v for k, v in imported_raw_data_ids})

        bulk = []
        for index, row in data.df.iterrows():
            temp_obj = SampleInfo(
                experiment=experiment,
                raw_data=RawData.objects.get(pk=row['raw_data_id']),
                pos=row['pos'],
                code='',
                name='',
                description='',
                buffer='',
                condition='',
                concentration='',
                unit='',
                group='',
                manual_outlier=False,
                is_blank=False,
            )
            bulk.append(temp_obj)

        SampleInfo.objects.bulk_create(bulk)

        # Save default settings
        default_transition_settings = DefaultTransitionProcessingSettings.objects.get(parser=parser)
        default_transition_settings_dict = {k: v for k, v in default_transition_settings.__dict__.items() if k not in ['_state', 'id', 'parser_id']}
        new_transition_settings = TransitionProcessingSettings(
            experiment=experiment,
            default_settings=default_transition_settings,
            data_types_available=data.df['data_type'].unique().tolist(),
            **default_transition_settings_dict
        )
        new_transition_settings.save()

        default_peak_finding_settings = DefaultPeakFindingSettings.objects.get(parser=parser)
        default_peak_finding_settings_dict = {k: v for k, v in default_peak_finding_settings.__dict__.items() if k not in ['_state', 'id', 'parser_id']}
        new_peak_settings = PeakFindingSettings(
            experiment=experiment,
            default_settings=default_peak_finding_settings,
            **default_peak_finding_settings_dict
        )
        new_peak_settings.save()

        serializer = ExperimentsSerializer(experiment)

        return Response(serializer.data, status=201)


class FetchExperiments(APIView):

    def post(self, request):
        experiments = Experiments.objects.all()
        serialised = ExperimentsSerializer(experiments, many=True)

        return JsonResponse(serialised.data, safe=False, status=200)


class UpdateExperimentInfo(APIView):

    def put(self, request):
        serializer = ExperimentsSerializer(data=request.data, ignore_fields=['parser'])

        if not serializer.is_valid():
            return Response({'update_status': 'fail'}, status=400)

        Experiments.objects.filter(pk=serializer.data['id']).update(
            name=serializer.data['name'],
            project=serializer.data['project'],
            user=serializer.data['user'],
            notes=serializer.data['notes'],
        )

        return Response({'update_status': 'success'}, status=200)


class DeleteExperiment(APIView):

    def post(self, request):
        Experiments.objects.get(pk=request.data['id']).delete()
        return Response({'update_status': 'success'}, status=200)


class FetchSampleInfo(APIView):

    def post(self, request):
        experiment_id = int(request.POST.get('experiment_id'))
        sample_info = SampleInfo.objects.filter(experiment_id=experiment_id).all()
        serialised = SampleInfoSerializer(sample_info, many=True)

        return JsonResponse(serialised.data, safe=False, status=200)


class UpdateSampleInfo(APIView):

    def put(self, request):
        serializer = SampleInfoSerializer(data=request.data, many=True, ignore_fields=('experiment', 'raw_data'))

        if not serializer.is_valid():
            return Response({'update_status': 'fail'}, status=400)

        for i in serializer.data:
            SampleInfo.objects.filter(pk=i['id']).update(
                # Using conditionals here since handsontable can return null values
                code='' if i['code'] is None else i['code'],
                name='' if i['name'] is None else i['name'],
                description='' if i['description'] is None else i['description'],
                buffer='' if i['buffer'] is None else i['buffer'],
                condition='' if i['condition'] is None else i['condition'],
                concentration='' if i['concentration'] is None else i['concentration'],
                unit='' if i['unit'] is None else i['unit'],
                group='' if i['group'] is None else i['group'],
                manual_outlier=False if i['manual_outlier'] is None else i['manual_outlier'],
                is_blank=False if i['is_blank'] is None else i['is_blank'],
            )

        return Response({'update_status': 'success'}, status=200)


class FetchTransitionProcessingSettings(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])
        settings = TransitionProcessingSettings.objects.get(experiment=experiment)
        serialised = TransitionProcessingSettingsSerializer(settings)

        return JsonResponse(serialised.data, safe=False, status=200)


class UpdateTransitionProcessingSettings(APIView):

    def put(self, request):
        serializer = TransitionProcessingSettingsSerializer(data=request.data, ignore_fields=('id', 'experiment', 'default_settings'))
        experiment = Experiments.objects.get(pk=request.data['experiment'])

        if not serializer.is_valid():
            return Response({'update_status': 'fail'}, status=400)

        settings = TransitionProcessingSettings.objects.get(experiment=experiment)

        for key, value in serializer.data.items():
            setattr(settings, key, value)
        settings.save()

        # Delete processed data if settings changed
        if settings.has_changed:
            processed_data = ProcessedTransitionData.objects.filter(experiment=experiment).all()
            processed_data.delete()

        return JsonResponse(serializer.data, status=200)


class ResetTransitionProcessingSettings(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])
        default_transition_settings = DefaultTransitionProcessingSettings.objects.get(parser=experiment.parser)
        default_transition_settings_dict = {k: v for k, v in default_transition_settings.__dict__.items() if k not in ['_state', 'id', 'parser_id', 'default_settings', 'data_types_available']}

        settings = TransitionProcessingSettings.objects.get(experiment=experiment)

        for key, value in default_transition_settings_dict.items():
            setattr(settings, key, value)
        settings.save()

        if settings.has_changed:
            processed_data = ProcessedTransitionData.objects.filter(experiment=experiment).all()
            processed_data.delete()

        return Response({'update_status': 'success'}, status=200)


class PreviewTransitionProcessing(APIView):

    def post(self, request):
        # Process the data
        processor = TransitionProcessor(request.data['id'], pos_filter=request.data['filter'])
        df = processor.result_df

        experiment = Experiments.objects.get(pk=request.data['id'])
        processing_settings = TransitionProcessingSettings.objects.get(experiment=experiment)
        raw_data = RawData.objects.filter(
            experiment=experiment,
            data_type=processing_settings.selected_data_type,
            pos__in=request.data['filter']
        )

        # This might not be needed since ordering is conserved
        # However, in light of being explicit over implicit - objects are explicitly mapped to pos
        raw_data_obj_dict = {}
        for i in raw_data:
            raw_data_obj_dict[i.pos] = i

        # Create objects
        obj_list = []
        for index, row in df.iterrows():
            obj = ProcessedTransitionData(
                experiment=experiment,
                processing_settings=processing_settings,
                raw_data=raw_data_obj_dict[row['pos']],
                pos=row['pos'],
                raw_x=row['raw_x'],
                raw_y=row['raw_y'],
                regular_x=row['regular_x'],
                regular_y=row['regular_y'],
                normal_y=row['normal_y'],
                smooth_y=row['smooth_y'],
                first_der_y=row['first_der_y'],
            )
            obj_list.append(obj.__dict__)

        serializer = ProcessedTransitionDataSerializer(data=obj_list, many=True, ignore_fields=['id', 'experiment', 'processing_settings', 'raw_data'])

        if serializer.is_valid():
            return JsonResponse(serializer.data, safe=False, status=200)

        return Response({'processing_status': 'fail'}, status=500)


class ProcessTransitionData(APIView):

    def post(self, request):

        experiment = Experiments.objects.get(pk=request.data['id'])
        processing_settings = TransitionProcessingSettings.objects.get(experiment=experiment)
        raw_data = RawData.objects.filter(
            experiment=experiment,
            data_type=processing_settings.selected_data_type
        )

        # If data exists, means that the settings were not changed and therefore data is still valid
        processed_data = ProcessedTransitionData.objects.filter(experiment=experiment).all()
        if len(processed_data) > 0:
            serializer = ProcessedTransitionDataSerializer(processed_data, many=True, ignore_fields=['id', 'experiment', 'processing_settings', 'raw_data'])
            return JsonResponse(serializer.data, safe=False, status=200)

        # Process the data otherwise
        processor = TransitionProcessor(request.data['id'])
        df = processor.result_df

        # This might not be needed since ordering is conserved
        # However, in light of being explicit over implicit - objects are explicitly mapped to pos
        raw_data_obj_dict = {}
        for i in raw_data:
            raw_data_obj_dict[i.pos] = i

        obj_list = []
        for index, row in df.iterrows():
            obj, created = ProcessedTransitionData.objects.update_or_create(
                # These ensure uniqueness
                experiment=experiment,
                processing_settings=processing_settings,
                raw_data=raw_data_obj_dict[row['pos']],
                pos=row['pos'],

                # These are the values added, or changed if objects already exist
                defaults={
                    'raw_x': row['raw_x'],
                    'raw_y': row['raw_y'],
                    'regular_x': row['regular_x'],
                    'regular_y': row['regular_y'],
                    'normal_y': row['normal_y'],
                    'smooth_y': row['smooth_y'],
                    'first_der_y': row['first_der_y'],
                },
            )
            obj_list.append(obj.__dict__)

        # Serialise the data and send to front end
        serializer = ProcessedTransitionDataSerializer(data=obj_list, many=True, ignore_fields=['id', 'experiment', 'processing_settings', 'raw_data'])

        if serializer.is_valid():
            return JsonResponse(serializer.data, safe=False, status=200)
        return JsonResponse({'processing_status': 'fail'}, status=500)



class FetchPeakFindingSettings(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])
        settings = PeakFindingSettings.objects.get(experiment=experiment)
        serialised = PeakFindingSettingsSerializer(settings)

        return JsonResponse(serialised.data, safe=False, status=200)


class UpdatePeakFindingSettings(APIView):

    def put(self, request):
        serializer = PeakFindingSettingsSerializer(data=request.data, ignore_fields=('id', 'experiment', 'default_settings'))
        experiment = Experiments.objects.get(pk=request.data['experiment'])

        if not serializer.is_valid():
            return Response({'update_status': 'fail'}, status=400)

        settings = PeakFindingSettings.objects.get(experiment=experiment)

        for key, value in serializer.data.items():
            setattr(settings, key, value)
        settings.save()

        # Delete peak data if settings changed
        if settings.has_changed:
            peak_data = PeakData.objects.filter(experiment=experiment).all()
            peak_data.delete()

        return JsonResponse(serializer.data, status=200)


class ResetPeakFindingSettings(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])
        default_peak_finding_settings = DefaultPeakFindingSettings.objects.get(parser=experiment.parser)
        default_peak_finding_settings_dict = {k: v for k, v in default_peak_finding_settings.__dict__.items() if k not in ['_state', 'id', 'parser_id', 'default_settings']}

        settings = PeakFindingSettings.objects.get(experiment=experiment)

        for key, value in default_peak_finding_settings_dict.items():
            setattr(settings, key, value)
        settings.save()

        # Delete peak data if settings changed
        if settings.has_changed:
            peak_data = PeakData.objects.filter(experiment=experiment).all()
            peak_data.delete()

        return Response({'update_status': 'success'}, status=200)


class FindPeaks(APIView):

    def post(self, request):

        experiment = Experiments.objects.get(pk=request.data['id'])
        processing_settings = PeakFindingSettings.objects.get(experiment=experiment)
        transition_data = ProcessedTransitionData.objects.filter(
            experiment=experiment
        )

        # If data exists, means that the settings were not changed and therefore data is still valid
        peak_data = PeakData.objects.filter(experiment=experiment).all()
        if len(peak_data) > 0:
            serializer = PeakDataSerializer(peak_data, many=True, ignore_fields=['id', 'experiment', 'processing_settings', 'transition_data'])
            return JsonResponse(serializer.data, safe=False, status=200)

        # Process the data otherwise
        processor = PeakFindingProcessor(request.data['id'])
        df = processor.result_df

        # This might not be needed since ordering is conserved
        # However, in light of being explicit over implicit - objects are explicitly mapped to pos
        transition_data_obj_dict = {}
        for i in transition_data:
            transition_data_obj_dict[i.pos] = i

        obj_list = []
        for index, row in df.iterrows():
            obj, created = PeakData.objects.update_or_create(
                # These ensure uniqueness
                experiment=experiment,
                processing_settings=processing_settings,
                transition_data=transition_data_obj_dict[row['pos']],
                pos=row['pos'],

                # These are the values added, or changed if objects already exist
                defaults={
                    'x': row['x'],
                    'y': row['y'],
                    'index': row['index'],
                },
            )
            obj_list.append(obj.__dict__)

        # Serialise the data and send to front end
        serializer = PeakDataSerializer(data=obj_list, many=True, ignore_fields=['id', 'experiment', 'processing_settings', 'transition_data'])

        if serializer.is_valid():
            return JsonResponse(serializer.data, safe=False, status=200)
        return JsonResponse({'processing_status': 'fail'}, status=500)

