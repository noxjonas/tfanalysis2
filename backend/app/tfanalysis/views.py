from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser

# from .models import Experiment, DefaultProcessingSettings, ProcessingSettings, ProcessedDsfData
# from .serializers import ExperimentSerializer, , ProcessingSettingsSerializer, ProcessedDsfDataSerializer

from tfanalysis.parsers import *

from tfanalysis.models import Parsers, Experiments, InstrumentInfo, RawData, SampleInfo, DefaultTransitionProcessingSettings, TransitionProcessingSettings, ProcessedTransitionData, DefaultPeakFindingSettings, PeakFindingSettings, PeakData, SampleInfoScreens
from tfanalysis.serializers import ParsersSerializer, ExperimentsSerializer, SampleInfoSerializer, TransitionProcessingSettingsSerializer, ProcessedTransitionDataSerializer, PeakFindingSettingsSerializer, PeakDataSerializer, SampleInfoScreensSerializer

from tfanalysis.processors import TransitionProcessor, PeakFindingProcessor


from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder


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
                return JsonResponse({'custom_message': 'Parser returned invalid data:', 'detail': parser_validator.errors}, status=400)

        except Exception as E:
            [os.remove(i) for i in paths]  # Cleanup files
            return JsonResponse({'custom_message': 'Parser failed with following error:', 'detail': [str(E)]}, status=400)

        parser = Parsers.objects.filter(python_class_name=request.POST.get('parser'))[0]

        experiment = Experiments(
            parser=parser,
            name=request.POST.get('name'),
            project=request.POST.get('project'),
            user=request.POST.get('user'),
            notes=request.POST.get('notes'),
            instrument_info=json.dumps(data.instrument_info) if hasattr(data, 'instrument_info') else json.dumps({}),
            parse_warnings=json.dumps(data.warnings) if hasattr(data, 'warnings') else json.dumps({}),
            autoprocess=True if request.POST.get('autoprocess') == 'true' else False,
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
                outlier=False,
                blank=False,
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

        return JsonResponse(serializer.data, status=201)


class FetchExperiments(APIView):

    def post(self, request):
        experiments = Experiments.objects.all()
        serializer = ExperimentsSerializer(experiments, many=True)

        return JsonResponse(serializer.data, safe=False, status=200)


class UpdateExperimentInfo(APIView):

    def put(self, request):
        serializer = ExperimentsSerializer(data=request.data, ignore_fields=['parser'])

        if not serializer.is_valid():
            # TODO: implement generic cutom_message errors on frontend
            return JsonResponse({'custom_message': 'Data supplied in experiment upload form is invalid!'}, status=400)

        experiment = Experiments.objects.get(pk=serializer.data['id'])

        for key, value in serializer.data.items():
            setattr(experiment, key, value)
            experiment.save()

        serializer = ExperimentsSerializer(experiment)

        return JsonResponse(serializer.data, status=200)


class DeleteExperiment(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])#.delete()

        # TODO: need to delete separately, otherwise it kills django; see if problem persists if db completely remade; mixins?
        PeakFindingSettings.objects.filter(experiment=experiment).delete()
        TransitionProcessingSettings.objects.filter(experiment=experiment).delete()

        experiment.delete()
        return Response({'update_status': 'success'}, status=200)


class FetchSampleInfo(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])
        sample_info = SampleInfo.objects.filter(experiment=experiment).all()
        serializer = SampleInfoSerializer(sample_info, many=True)

        return JsonResponse(serializer.data, safe=False, status=200)


class UpdateSampleInfo(APIView):

    def put(self, request):
        serializer = SampleInfoSerializer(data=request.data, many=True, allow_null=True, ignore_fields=('experiment', 'raw_data'))

        # TODO: handsontable still gives some weird nonsense sometimes, keep track
        if not serializer.is_valid():
            print('Sample info update failing', serializer.errors)
            return Response({'update_status': 'fail'}, status=400)

        print('sample info serialiser data', serializer.data)

        for i in serializer.data:
            SampleInfo.objects.filter(pk=i['id']).update(
                # Using conditionals here since handsontable can return null values
                code=i['code'],
                name=i['name'],
                description=i['description'],
                buffer=i['buffer'],
                condition=i['condition'],
                concentration=i['concentration'],
                unit=i['unit'],
                group=i['group'],
                outlier=False if i['outlier'] is None else i['outlier'],
                blank=False if i['blank'] is None else i['blank'],
            )

        return JsonResponse(serializer.data, safe=False, status=200)


class FetchTransitionProcessingSettings(APIView):

    def post(self, request):
        experiment = Experiments.objects.get(pk=request.data['id'])
        settings = TransitionProcessingSettings.objects.get(experiment=experiment)
        serialised = TransitionProcessingSettingsSerializer(settings)

        return JsonResponse(serialised.data, safe=False, status=200)


class UpdateTransitionProcessingSettings(APIView):

    def put(self, request):
        serializer = TransitionProcessingSettingsSerializer(data=request.data, ignore_fields=('id', 'experiment', 'default_settings'))
        # This receives form data, where id refers to settings id, not experiment
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

        return JsonResponse(TransitionProcessingSettingsSerializer(settings).data, status=200)


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

        return Response(TransitionProcessingSettingsSerializer(settings).data, status=200)


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
        print('trying to update experiment', request.data['id'], 'with update of peak finding')
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

        return JsonResponse(PeakFindingSettingsSerializer(settings).data, status=200)


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

        return Response(PeakFindingSettingsSerializer(settings).data, status=200)


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
        # TODO: check if this fails with bad options?
        try:
            processor = PeakFindingProcessor(request.data['id'])
        except Exception as E:
            print('Peak finding fails:\n', E)
            return JsonResponse({'processing_status': 'fail'}, status=500)

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

        print('serializer failing', serializer.errors)
        return JsonResponse({'processing_status': 'fail'}, status=500)


class UploadSampleInfo(APIView):

    def post(self, request):
        file_obj = request.FILES.getlist('files')[0]
        path = settings.MEDIA_ROOT + default_storage.save(file_obj.name, ContentFile(file_obj.read()))

        try:
            data = SampleInfoUploadParser(path, True if request.data['column_names'] == 'true' else False)
            os.remove(path) # Cleanup file

        except Exception as E:

            os.remove(path) # Cleanup file
            return JsonResponse({'custom_message': 'Sample info import failed', 'detail': [str(E)]}, status=400)

        return JsonResponse(data.json, safe=False, status=200)


class FetchSampleInfoScreensNames(APIView):

    def post(self, request):
        df = pd.DataFrame(SampleInfoScreens.objects.values('screen_name', 'updated'))
        if len(df) == 0:
            return JsonResponse(json.loads(df.to_json(orient='records')), safe=False, status=200)
        df['count'] = df['screen_name'].map(df.groupby(['screen_name']).size().to_dict())
        df = df.drop_duplicates()

        return JsonResponse(json.loads(df.to_json(orient='records')), safe=False, status=200)


class SaveSampleInfoScreen(APIView):

    def post(self, request):
        serializer = SampleInfoScreensSerializer(data=request.data, many=True, allow_null=True, ignore_fields=['id'])

        if not serializer.is_valid():
            print('Save sample info screen serializer failing', serializer.errors)
            return Response({'update_status': 'fail'}, status=400)

        # Make sure the name does not already exist. Although this is already done on front-end
        if len(SampleInfoScreens.objects.filter(screen_name=serializer.data[0]['screen_name']).all()) > 0:
            return Response({'update_status': 'fail'}, status=409)

        now = timezone.now()
        bulk = []
        for i in serializer.data:
            temp_obj = SampleInfoScreens(
                # Using conditionals here since handsontable can return null values
                screen_name=i['screen_name'],
                updated=now,
                pos=i['pos'],
                code=i['code'],
                name=i['name'],
                description=i['description'],
                buffer=i['buffer'],
                condition=i['condition'],
                concentration=i['concentration'],
                unit=i['unit'],
                group=i['group'],
                outlier=False if i['outlier'] is None else i['outlier'],
                blank=False if i['blank'] is None else i['blank'],
            )
            bulk.append(temp_obj)

        SampleInfoScreens.objects.bulk_create(bulk)

        df = pd.DataFrame(SampleInfoScreens.objects.values('screen_name', 'updated'))
        df['count'] = df['screen_name'].map(df.groupby(['screen_name']).size().to_dict())
        df = df.drop_duplicates()

        return JsonResponse(json.loads(df.to_json(orient='records')), safe=False, status=200)


class DeleteSampleInfoScreen(APIView):

    def post(self, request):
        SampleInfoScreens.objects.filter(screen_name=request.data['screen_name']).delete()

        df = pd.DataFrame(SampleInfoScreens.objects.values('screen_name', 'updated'))
        if len(df) == 0:
            return JsonResponse(json.loads(df.to_json(orient='records')), safe=False, status=200)
        df['count'] = df['screen_name'].map(df.groupby(['screen_name']).size().to_dict())
        df = df.drop_duplicates()

        return JsonResponse(json.loads(df.to_json(orient='records')), safe=False, status=200)


class FetchSampleInfoScreen(APIView):

    def post(self, request):

        data = SampleInfoScreens.objects.filter(screen_name=request.data['screen_name']).all()
        serializer = SampleInfoScreensSerializer(data, many=True, ignore_fields=('id', 'screen_name', 'updated'))

        return JsonResponse(serializer.data, safe=False, status=200)



