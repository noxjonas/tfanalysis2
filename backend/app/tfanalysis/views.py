from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from .models import Experiment, RawData, SampleInfo, DefaultProcessingSettings, ProcessingSettings, ProcessedDsfData
from .serializers import RawDataSerializer, ExperimentSerializer, SampleInfoSerializer, ProcessingSettingsSerializer, ProcessedDsfDataSerializer
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from app.main import settings
import time
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .parsers import ExampleParser
from django.db import connections
import io
import datetime
from django.utils import timezone
from .processors import DsfProcessor
import pandas as pd
import json


class UploadData(APIView):

    def post(self, request):
        file_objs = request.FILES.getlist('files')
        paths = []
        file_types = []
        for file_obj in file_objs:
            path = default_storage.save(file_obj.name, ContentFile(file_obj.read()))
            paths.append(settings.MEDIA_ROOT + path)
            file_types.append('example_'+path.split('.', 1)[1])

        data = ExampleParser(paths)

        new_experiment = Experiment(
            name=request.POST.get('name'),
            user=request.POST.get('user'),
            notes=request.POST.get('notes'),
            file_type='\n'.join(file_types),
            storage_path='\n'.join(paths),
            errors='\n'.join(data.errors),
        )
        new_experiment.save()

        bulk = []
        for index, row in data.df.iterrows():
            temp_obj = RawData(
                experiment=new_experiment,
                data_type=row['data_type'],
                pos=row['pos'],
                col_index=row['col_index'],
                row_index=row['row_index'],
                raw_x=row['raw_x'].tolist(),
                raw_y=row['raw_y'].tolist(),
            )
            bulk.append(temp_obj)

        RawData.objects.bulk_create(bulk)

        imported_raw_data_ids = RawData.objects.filter(experiment=new_experiment.id).values_list('id', flat=True)
        data.df['raw_data_id'] = imported_raw_data_ids

        bulk = []
        for index, row in data.df.iterrows():
            temp_obj = SampleInfo(
                experiment=new_experiment,
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

        # save default settings; first get the object based on filetype
        default_settings = DefaultProcessingSettings.objects.get(file_type=file_types[0])

        new_settings = ProcessingSettings(
            experiment=new_experiment, # I will also get sample info from this
            #changed=timezone.now(),
            selected_data_type='fluorescence',

            flat_blank=0, # If blank is set as a number
            blank_average=0,
            skip_outliers=True,

            # These can be taken from raw data instead
            truncate_x_min=default_settings.truncate_x_min,
            truncate_x_max=default_settings.truncate_x_max,

            interpolation_indices=default_settings.interpolation_indices, # 0.1
            interpolation_method=default_settings.interpolation_method, # 'linear'
            interpolation_order=default_settings.interpolation_order, # (can be empty)

            peak_mode=default_settings.peak_mode, # 'positive', 'negative', 'both'
            peak_derivative_of=default_settings.peak_derivative_of, # 'normalised', 'raw'
            peak_temp_limit_min=default_settings.peak_temp_limit_min,
            peak_temp_limit_max=default_settings.peak_temp_limit_max,
            peak_prominence_min=default_settings.peak_prominence_min,
            peak_prominence_max=default_settings.peak_prominence_max,
            peak_distance=default_settings.peak_distance, # will need to convert this to int based on interpolation_indices
            peak_number_limit=default_settings.peak_number_limit,
            peak_height_min=default_settings.peak_height_min,
            peak_height_max=default_settings.peak_height_max,
            peak_width_min=default_settings.peak_width_min, # not actually used
            peak_width_max=default_settings.peak_width_max, # not actually used
            peak_threshold_min=default_settings.peak_threshold_min, # not actually used
            peak_threshold_max=default_settings.peak_threshold_max, # not actually used

            smoothing_coefficient=default_settings.smoothing_coefficient, #percent

            difference_significance=default_settings.difference_significance,

            x_unit=default_settings.x_unit,
            y_unit=default_settings.y_unit,
            x_label=default_settings.x_label,
            y_label=default_settings.y_label,
        )

        new_settings.save()

        return Response({'parse_status': 'success'}, status=status.HTTP_201_CREATED)






class FetchExperiments(APIView):

    def post(self, request):
        experiments = Experiment.objects.all()
        serialised = ExperimentSerializer(experiments, many=True)

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

        now = timezone.now()
        for i in serializer.data:
            print('what is', i)

            SampleInfo.objects.filter(pk=i['id']).update(
                updated=now,
                # pos=i['pos'], # does not need updating
                # Using conditionals here since handsontable can return null values
                code='' if i['code'] is None else i['code'],  # i['code'],
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
        serializer = ProcessingSettingsSerializer(data=request.data, ignore_fields=('experiment', 'processing_info', 'raw_data'))

        if not serializer.is_valid():
            return Response({'update_status': 'fail'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()

        # use 'id' from data as it is lost by serializer due to read-only properties
        ProcessingSettings.objects.filter(pk=serializer.data['id']).update(
            changed=now,
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
