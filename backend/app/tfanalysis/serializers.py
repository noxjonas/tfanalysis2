from rest_framework import serializers
from .models import Experiment, SampleInfo, ProcessingSettings, ProcessedData, DefaultProcessingSettings, ProcessedDsfData
from .models import Parsers, Experiments, TransitionProcessingSettings, ProcessedTransitionData, RawData

class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    """
    Custom ModelSerializer that takes ignore_fields argument.
    Used to ignore foreign keys when validating incoming data from frontend
    """

    # This ensures that the serialiser does not lose id from the request (as they are not included in the models)
    id = serializers.IntegerField(required=False)

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


class ParsersSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parsers
        fields = '__all__'


class ExperimentsSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = Experiments
        fields = '__all__'


class TransitionProcessingSettingsSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = TransitionProcessingSettings
        fields = '__all__'


class ProcessedTransitionDataSerializer(DynamicFieldsModelSerializer):
    class Meta:
        model = ProcessedTransitionData
        fields = '__all__'


#TODO do not write serializer for raw+processed data










#TODO: Move or remove stuff below

class ProcessedDsfDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessedDsfData
        fields = '__all__'


class ExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiment
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