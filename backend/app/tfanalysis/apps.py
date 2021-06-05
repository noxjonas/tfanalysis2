import inspect
import sys

from django.apps import AppConfig
from django.db.models.signals import pre_save

# Important!
from .parsers import *


class TfanalysisConfig(AppConfig):
    name = 'tfanalysis'

    def create_parsers(self):
        # Register the parser classes. These calls are idempotent so it does not matter how many times this runs.

        Parsers = self.get_model('Parsers')
        DefaultTransitionProcessingSettings = self.get_model('DefaultTransitionProcessingSettings')
        DefaultPeakFindingSettings = self.get_model('DefaultPeakFindingSettings')

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
                peak_obj, created = DefaultPeakFindingSettings.objects.update_or_create(
                    parser=parser_obj,
                    defaults=obj.default_peak_finding_settings
                )

    def ready(self):
        try:
            self.create_parsers()
        except Exception as E:
            # TODO: use appropriate exception
            print('\nTables not created yet. Skipping parser registration...\n', E)
