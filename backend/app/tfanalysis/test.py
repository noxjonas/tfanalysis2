from parsers import *
from django.db import migrations
import sys, inspect

def print_classes():
    Parsers = apps.get_registered_model('tfanalysis', 'Parsers')
    DefaultTransitionProcessingSettings = apps.get_registered_model('tfanalysis', 'DefaultTransitionProcessingSettings')
    DefaultPeakProcessingSettings = apps.get_registered_model('tfanalysis', 'DefaultPeakProcessingSettings')

    for name, obj in inspect.getmembers(sys.modules[__name__]):
        if inspect.isclass(obj):
            if 'parser_registration_settings' in dir(obj):
                print('found the one', str(obj.parser_registration_settings))
                print('the name is', obj.__name__)
                parser_obj, created = Parsers.objects.update_or_create(
                    python_class_name=obj.__name__,
                    defaults=obj.parser_registration_settings
                )
                obj, created = DefaultTransitionProcessingSettings.objects.update_or_create(
                    parser=parser_obj,
                    defaults=obj.default_transition_processing_settings
                )
                obj, created = DefaultPeakProcessingSettings.objects.update_or_create(
                    parser=parser_obj,
                    defaults=obj.default_peak_processing_settings
                )


def create_parsers(apps, schema_editor):
    print('hello', apps.get_app_config('tfanalysis').get_models())
    print_classes()

    Parser = apps.get_registered_model('tfanalysis', 'Parsers')
    obj, created = Parser.objects.update_or_create(
        # These ensure uniqueness
        python_class_name='DummyParser',
        name='Dummy Parser',
        defaults={
            'info': 'This parser is not functional and will not parse any data',
            # Helps prevent users from unnecessarily uploading wrong files. Must be a list with at least one entry.
            'accepted_file_types': ['csv', 'xlsx', 'customextension'],
            # Registers data sources available for each sample. Must be a list with at least one entry.
            'available_data_types': ['fluorescence', 'light_scattering'],
            # Informs user whether multiple datasets can be merged together with this parser
            'allow_data_merge': True
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ('tfanalysis', '0001_initial')
    ]

    operations = [
        migrations.RunPython(create_parsers),
    ]


if __name__ == '__main__':
    print_classes()