from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from .models import Experiment, RawData, SampleInfo, DefaultProcessingSettings, ProcessingSettings, ProcessedDsfData
from .serializers import RawDataSerializer, ExperimentSerializer, SampleInfoSerializer, ProcessingSettingsSerializer, ProcessedDsfDataSerializer

from .models import Parsers, Experiments, InstrumentInfo, DefaultTransitionProcessingSettings, TransitionProcessingSettings, DefaultPeakProcessingSettings, PeakProcessingSettings
from .serializers import ParsersSerializer, ExperimentsSerializer


from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import time
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .parsers import *
from django.db import connections
import io
import datetime
from django.utils import timezone
from .processors import DsfProcessor
import pandas as pd
import json
import os


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
            **default_transition_settings_dict
        )
        new_transition_settings.save()

        default_peak_settings = DefaultPeakProcessingSettings.objects.get(parser=parser)
        default_peak_settings_dict = {k: v for k, v in default_peak_settings.__dict__.items() if k not in ['_state', 'id', 'parser_id']}
        new_peak_settings = PeakProcessingSettings(
            experiment=experiment,
            default_settings=default_peak_settings,
            **default_peak_settings_dict
        )
        new_peak_settings.save()

        serializer = ExperimentsSerializer(experiment)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FetchExperiments(APIView):

    def post(self, request):
        experiments = Experiments.objects.all()
        serialised = ExperimentsSerializer(experiments, many=True)

        return JsonResponse(serialised.data, safe=False, status=status.HTTP_200_OK)


class FetchSampleInfo(APIView):

    def post(self, request):
        experiment_id = int(request.POST.get('experiment_id'))
        sample_info = SampleInfo.objects.filter(experiment_id=experiment_id).all()
        serialised = SampleInfoSerializer(sample_info, many=True)

        return JsonResponse(serialised.data, safe=False, status=status.HTTP_200_OK)


class UpdateSampleInfo(APIView):

    def put(self, request):
        serializer = SampleInfoSerializer(data=request.data, many=True, ignore_fields=('experiment', 'raw_data'))

        if not serializer.is_valid():
            return Response({'update_status': 'fail'}, status=status.HTTP_400_BAD_REQUEST)

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

        return Response({'update_status': 'success'}, status=status.HTTP_200_OK)


class FetchProcessingSettings(APIView):

    def post(self, request):
        experiment_id = int(request.POST.get('experiment_id'))
        processing_settings = ProcessingSettings.objects.get(experiment_id=experiment_id)
        serialised = ProcessingSettingsSerializer(processing_settings)

        return JsonResponse(serialised.data, safe=False, status=status.HTTP_200_OK)


class UpdateProcessingSettings(APIView):

    def put(self, request):
        serializer = ProcessingSettingsSerializer(data=request.data, ignore_fields=['experiment'])

        if not serializer.is_valid():
            print(repr(serializer), '\n\n', serializer.errors)
            return Response({'update_status': 'fail'}, status=status.HTTP_400_BAD_REQUEST)

        ProcessingSettings.objects.filter(pk=serializer.data['id']).update(
            **serializer.data
        )

        return Response({'update_status': 'success'}, status=status.HTTP_200_OK)



class ProcessData(APIView):

    def post(self, request):
        experiment_id = int(request.POST.get('experiment_id'))

        # filter for data_type too; meaning first get processing settings
        processing_settings = ProcessingSettings.objects.filter(experiment_id=experiment_id).values()[0]
        raw_data_df = pd.DataFrame(list(RawData.objects.filter(
            experiment_id=experiment_id,
            data_type=processing_settings['selected_data_type'],
        ).values()))
        sample_info_df = pd.DataFrame(list(SampleInfo.objects.filter(experiment_id=experiment_id).values()))

        processor = DsfProcessor(experiment_id, raw_data_df, sample_info_df, processing_settings)
        df = processor.result_df.copy()
        processor.__del__()

        experiment_obj = Experiment.objects.get(id=experiment_id)
        processing_settings_obj = ProcessingSettings.objects.get(id=processing_settings['id'])

        raw_data_objs = RawData.objects.filter(
            experiment_id=experiment_id,
            data_type=processing_settings['selected_data_type'],
        )

        # This might not be needed since ordering is conserved
        # However, in light of being explicit over implicit - objects are explicitly mapped to pos
        raw_data_obj_dict = {}
        for i in raw_data_objs:
            raw_data_obj_dict[i.pos] = i

        for index, row in df.iterrows():
            obj, created = ProcessedDsfData.objects.update_or_create(
                # These ensure uniqueness
                experiment=experiment_obj,
                processing_info=processing_settings_obj,
                raw_data=raw_data_obj_dict[row['pos']],
                pos=row['pos'],

                # These are the values added, or changed if objects already exist
                defaults={
                    'scatter_raw_x': row['scatter_raw_x'],
                    'scatter_raw_y': row['scatter_raw_y'],
                    'scatter_regular_x': row['scatter_regular_x'],
                    'scatter_regular_y': row['scatter_regular_y'],
                    'scatter_normal_y': row['scatter_normal_y'],
                    'scatter_smooth_y': row['scatter_smooth_y'],
                    'scatter_first_der_y': row['scatter_first_der_y'],
                    'all_peaks': row['all_peaks'],
                    'top_peak': row['top_peak'],
                },
            )

        # Retrieve back the data and serialise
        data = ProcessedDsfData.objects.filter(experiment_id=experiment_id).all()
        serializer = ProcessedDsfDataSerializer(data, many=True)
        return JsonResponse(serializer.data, safe=False, status=status.HTTP_200_OK)


#TODO: write a view to reset processing settings to default
