import inspect
import sys

from django.apps import AppConfig
from django.db.models.signals import pre_save

from .parsers import *


class TfanalysisConfig(AppConfig):
    name = 'tfanalysis'

    def ready(self):
        # Register the parser classes. These calls are idempotent so it does not matter how many times this runs.
        Parsers = self.get_model('Parsers')
        DefaultTransitionProcessingSettings = self.get_model('DefaultTransitionProcessingSettings')
        DefaultPeakProcessingSettings = self.get_model('DefaultPeakProcessingSettings')

        for name, obj in inspect.getmembers(sys.modules[__name__]):
            if inspect.isclass(obj) and 'parser_registration_settings' in dir(obj):
                print('Registering', obj.__name__)
                parser_obj, created = Parsers.objects.update_or_create(
                    python_class_name=obj.__name__,
                    defaults=obj.parser_registration_settings
                )
                transition_obj, created = DefaultTransitionProcessingSettings.objects.update_or_create(
                    parser=parser_obj,
                    defaults=obj.default_transition_processing_settings
                )
                peak_obj, created = DefaultPeakProcessingSettings.objects.update_or_create(
                    parser=parser_obj,
                    defaults=obj.default_peak_processing_settings
                )
