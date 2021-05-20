# Generated by Django 3.1.7 on 2021-05-06 19:30

import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='DefaultProcessingSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('notes', models.TextField()),
                ('file_type', models.TextField()),
                ('truncate_x_min', models.FloatField(default=15.0)),
                ('truncate_x_max', models.FloatField(default=95.0)),
                ('interpolation_indices', models.FloatField(default=0.1)),
                ('interpolation_method', models.CharField(default='linear', max_length=100)),
                ('interpolation_order', models.IntegerField(default=1)),
                ('peak_mode', models.CharField(default='positive', max_length=100)),
                ('peak_derivative_of', models.CharField(default='normalised', max_length=100)),
                ('peak_temp_limit_min', models.FloatField(default=15.0)),
                ('peak_temp_limit_max', models.FloatField(default=95.0)),
                ('peak_prominence_min', models.FloatField(default=0.005)),
                ('peak_prominence_max', models.FloatField(default=1.0)),
                ('peak_distance', models.FloatField(default=5.0)),
                ('peak_number_limit', models.IntegerField(default=2)),
                ('peak_height_min', models.FloatField(default=0.005)),
                ('peak_height_max', models.FloatField(default=1.0)),
                ('peak_width_min', models.FloatField(default=0.1)),
                ('peak_width_max', models.FloatField(default=80.0)),
                ('peak_threshold_min', models.FloatField(default=0.005)),
                ('peak_threshold_max', models.FloatField(default=1.0)),
                ('smoothing_coefficient', models.FloatField(default=10)),
                ('difference_significance', models.FloatField(default=0.5)),
                ('x_unit', models.TextField(default='°C')),
                ('y_unit', models.TextField(default='AU')),
                ('x_label', models.TextField(default='t')),
                ('y_label', models.TextField(default='')),
            ],
            options={
                'db_table': 'default_processing_settings',
            },
        ),
        migrations.CreateModel(
            name='Experiment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('user', models.TextField()),
                ('uploaded', models.DateTimeField(auto_now_add=True)),
                ('file_type', models.TextField()),
                ('storage_path', models.TextField()),
                ('errors', models.TextField()),
                ('notes', models.TextField()),
                ('screen', models.TextField()),
            ],
            options={
                'db_table': 'experiment',
            },
        ),
        migrations.CreateModel(
            name='RawData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data_type', models.TextField()),
                ('pos', models.CharField(max_length=16)),
                ('col_index', models.IntegerField()),
                ('row_index', models.IntegerField()),
                ('raw_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('raw_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('experiment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.experiment')),
            ],
            options={
                'db_table': 'raw_data',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='Test2ProcessedDsfData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('experiment', models.IntegerField()),
                ('pos', models.CharField(max_length=16)),
                ('scatter_raw_json', models.JSONField()),
                ('scatter_regular_json', models.JSONField()),
                ('all_peaks', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('top_peak', models.FloatField()),
            ],
            options={
                'db_table': 'test2_processed_dsf_data',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='Test3ProcessedDsfData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('experiment', models.IntegerField()),
                ('pos', models.CharField(max_length=16)),
                ('scatter_raw_json', models.TextField()),
                ('scatter_regular_json', models.TextField()),
                ('all_peaks', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('top_peak', models.FloatField()),
            ],
            options={
                'db_table': 'test3_processed_dsf_data',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='Test4ProcessedDsfData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('experiment', models.IntegerField()),
                ('pos', models.CharField(max_length=16)),
                ('scatter_raw_json', models.BinaryField()),
                ('scatter_regular_json', models.BinaryField()),
                ('all_peaks', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('top_peak', models.FloatField()),
            ],
            options={
                'db_table': 'test4_processed_dsf_data',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='TestProcessedDsfData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pos', models.CharField(max_length=16)),
                ('scatter_raw_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_raw_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_regular_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_regular_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_normal_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_smooth_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_first_der_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('top_peak', models.FloatField()),
                ('all_peaks', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('is_blank', models.BooleanField()),
                ('raw_data', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.rawdata')),
            ],
            options={
                'db_table': 'test_processed_dsf_data',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='SampleInfo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('updated', models.DateTimeField(auto_now_add=True)),
                ('pos', models.CharField(max_length=16)),
                ('code', models.TextField()),
                ('name', models.TextField()),
                ('description', models.TextField()),
                ('buffer', models.TextField()),
                ('condition', models.TextField()),
                ('concentration', models.TextField()),
                ('unit', models.TextField()),
                ('group', models.TextField()),
                ('manual_outlier', models.BooleanField()),
                ('is_blank', models.BooleanField()),
                ('experiment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.experiment')),
                ('raw_data', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.rawdata')),
            ],
            options={
                'db_table': 'sample_info',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='ProcessingSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('changed', models.DateTimeField(auto_now_add=True)),
                ('selected_data_type', models.TextField()),
                ('flat_blank', models.FloatField()),
                ('blank_average', models.FloatField()),
                ('skip_outliers', models.BooleanField(default=True)),
                ('truncate_x_min', models.FloatField()),
                ('truncate_x_max', models.FloatField()),
                ('interpolation_indices', models.FloatField(default=0.1)),
                ('interpolation_method', models.CharField(max_length=100)),
                ('interpolation_order', models.IntegerField(default=1)),
                ('peak_mode', models.CharField(default='positive', max_length=100)),
                ('peak_derivative_of', models.CharField(default='normalised', max_length=100)),
                ('peak_temp_limit_min', models.FloatField(default=15.0)),
                ('peak_temp_limit_max', models.FloatField(default=95.0)),
                ('peak_prominence_min', models.FloatField(default=0.005)),
                ('peak_prominence_max', models.FloatField(default=1.0)),
                ('peak_distance', models.FloatField(default=5.0)),
                ('peak_number_limit', models.IntegerField(default=1)),
                ('peak_height_min', models.FloatField(default=0.005)),
                ('peak_height_max', models.FloatField(default=1.0)),
                ('peak_width_min', models.FloatField(default=0.1)),
                ('peak_width_max', models.FloatField(default=80.0)),
                ('peak_threshold_min', models.FloatField(default=0.005)),
                ('peak_threshold_max', models.FloatField(default=1.0)),
                ('smoothing_coefficient', models.FloatField(default=10)),
                ('difference_significance', models.FloatField(default=0.5)),
                ('x_unit', models.TextField(default='°C')),
                ('y_unit', models.TextField(default='AU')),
                ('x_label', models.TextField(default='t')),
                ('y_label', models.TextField(default='')),
                ('experiment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.experiment')),
            ],
            options={
                'db_table': 'processing_settings',
            },
        ),
        migrations.CreateModel(
            name='ProcessedDsfData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pos', models.CharField(max_length=16)),
                ('scatter_raw_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_raw_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_regular_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_regular_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_normal_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_smooth_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_first_der_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('top_peak', models.FloatField()),
                ('all_peaks', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('experiment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.experiment')),
                ('processing_info', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.processingsettings')),
                ('raw_data', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.rawdata')),
            ],
            options={
                'db_table': 'processed_dsf_data',
                'ordering': ['pos'],
            },
        ),
        migrations.CreateModel(
            name='ProcessedData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pos', models.CharField(max_length=16)),
                ('scatter_raw_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_raw_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_regularised_x', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_regularised_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_normalised_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_smoothened_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('scatter_derivative_y', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('blank_difference', models.FloatField()),
                ('blank_deviation', models.FloatField()),
                ('top_peak', models.FloatField()),
                ('all_peaks', django.contrib.postgres.fields.ArrayField(base_field=models.FloatField(), size=None)),
                ('group', models.TextField()),
                ('hover_info', models.TextField()),
                ('experiment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.experiment')),
                ('processing_info', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.processingsettings')),
                ('raw_data', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tfanalysis.rawdata')),
            ],
            options={
                'db_table': 'processed_data',
                'ordering': ['pos'],
            },
        ),
    ]