import inspect
import sys
import os

from django.apps import AppConfig
from django.db.models.signals import pre_save
from django.db import connection
from django.core.management import call_command

# Important! Do not remove
from tfanalysis.parsers import *


class TfanalysisConfig(AppConfig):
    name = 'tfanalysis'

    def create_parsers(self):
        # Register the parser classes. These calls are idempotent so it does not matter how many times this runs.

        Parsers = self.get_model('Parsers')
        DefaultTransitionProcessingSettings = self.get_model('DefaultTransitionProcessingSettings')
        DefaultPeakFindingSettings = self.get_model('DefaultPeakFindingSettings')

        for name, obj in inspect.getmembers(sys.modules[__name__]):
            if inspect.isclass(obj) and 'parser_registration_settings' in dir(obj):
                print(f'Registering {obj.__name__}...')
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

    def tables_exist(self):
        all_tables = connection.introspection.table_names()
        if len(all_tables) > 0:
            print('Tables exist?', all_tables)
            return True
        else:
            print('\nTables for tfanalysis do not exist...')
            return False

    def do_first_migrations(self):
        if os.path.isdir('tfanalysis/migrations'):
            print('\nAttempting to make and do initial migrations...')
            migrations = [i for i in os.listdir('tfanalysis/migrations') if '__' not in i]

            if len(migrations) == 1 and migrations[0] == '0001_initial.py':
                print('\nOnly one migration found. Retying migrations...')
                call_command('migrate')
                call_command('migrate', app_label='tfanalysis', database='tfanalysis')
                return True

            elif len(migrations) > 0:
                print('\nMigrations already exist... Stopping', migrations)
                return False

            else:
                call_command('makemigrations')
                call_command('migrate')
                call_command('migrate', app_label='tfanalysis', database='tfanalysis')
                return True

    def ready(self):
        if self.tables_exist():
            self.create_parsers()
        else:
            if self.do_first_migrations():
                self.create_parsers()
            else:
                print('\nFailed to start. Terminating... from tfanalysis.apps.py')
                sys.exit(1)
