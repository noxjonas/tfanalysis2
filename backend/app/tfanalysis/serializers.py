from rest_framework import serializers
from .models import RawData, Experiment, SampleInfo, ProcessingSettings, ProcessedData, DefaultProcessingSettings, ProcessedDsfData


class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    """
    Custom ModelSerializer that takes ignore_fields argument.
    Used to ignore foreign keys when validating incoming data from frontend
    """

    def __init__(self, *args, **kwargs):
        # Don't pass the 'ignore_fields' arg up to the superclass
        ignore_fields = kwargs.pop('ignore_fields', None)

        # Instantiate the superclass normally
        super(DynamicFieldsModelSerializer, self).__init__(*args, **kwargs)

        if ignore_fields is not None:
            # Drop fields specified in ignore_fields
            disallowed = set(ignore_fields)
            for field_name in disallowed:
                self.fields.pop(field_name)


#TODO: use ... fields = '__all__'
class ProcessedDsfDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessedDsfData
        fields = '__all__'


class ExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiment
        fields = '__all__'


class RawDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawData
        fields = '__all__'


class SampleInfoSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = SampleInfo
        fields = '__all__'


class ProcessingSettingsSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = ProcessingSettings
        fields = '__all__'


class ProcessedDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessedData
        fields = '__all__'


class DefaultProcessingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefaultProcessingSettings
        fields = '__all__'