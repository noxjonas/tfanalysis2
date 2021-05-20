from django.db import models
from django.contrib.postgres.fields import ArrayField, JSONField


'''
‘nearest’, ‘zero’, ‘linear’, ‘quadratic’, ‘cubic’, ‘spline’, ‘barycentric’, ‘polynomial’: Passed to scipy.interpolate.interp1d. These methods use the numerical values of the index. Both ‘polynomial’ and ‘spline’ require that you also specify an order (int), e.g. df.interpolate(method='polynomial', order=5).


'''

class Experiment(models.Model):
    name = models.TextField()
    user = models.TextField()
    uploaded = models.DateTimeField(auto_now_add=True)
    file_type = models.TextField()
    storage_path = models.TextField()
    errors = models.TextField()
    notes = models.TextField()
    screen = models.TextField()

    class Meta:
        db_table = 'experiment'


class RawData(models.Model):
    experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
    data_type = models.TextField()

    pos = models.CharField(max_length=16)
    col_index = models.IntegerField()
    row_index = models.IntegerField()
    raw_x = ArrayField(models.FloatField())
    raw_y = ArrayField(models.FloatField())

    class Meta:
        db_table = 'raw_data'
        ordering = ['pos']


class SampleInfo(models.Model):
    experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
    raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # do not use this?
    updated = models.DateTimeField(auto_now_add=True)
    pos = models.CharField(max_length=16)
    code = models.TextField()
    name = models.TextField()
    description = models.TextField()
    buffer = models.TextField()
    condition = models.TextField()
    concentration = models.TextField()
    unit = models.TextField()
    group = models.TextField()
    manual_outlier = models.BooleanField()
    is_blank = models.BooleanField()

    class Meta:
        db_table = 'sample_info'
        ordering = ['pos']

# TODO: Should rename peak temp limit to x limit // although aren't these duplicate of truncation?
# TODO: Could have a checkbox to decide whether data actually needs to be truncated or are they limits for peak finding
# TODO: Above, but for default settings too
class ProcessingSettings(models.Model):
    experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE) # I will also get sample info from this
    changed = models.DateTimeField(auto_now_add=True) # TODO: change to 'updated' here and in the view
    selected_data_type = models.TextField()

    #blanks = ArrayField(models.CharField(max_length=16)) # Should take these from sample info
    flat_blank = models.FloatField() # TODO: If blank is set as a number; allow null to determine if used
    blank_average = models.FloatField() # Equals to flat_blank if there are no actual blanks specified
    skip_outliers = models.BooleanField(default=True)  # TODO: this should not affect processing, only viewing

    truncate_x_min = models.FloatField()
    truncate_x_max = models.FloatField()

    # Now these should be various settings
    interpolation_indices = models.FloatField(default=0.1) # 0.1
    interpolation_method = models.CharField(max_length=100) # 'linear'
    interpolation_order = models.IntegerField(default=1) # (can be empty)

    peak_mode = models.CharField(max_length=100, default='positive') # 'positive', 'negative', 'both'
    peak_derivative_of = models.CharField(max_length=100, default='normalised') # 'normalised', 'raw'
    peak_temp_limit_min = models.FloatField(default=15.0)
    peak_temp_limit_max = models.FloatField(default=95.0)
    peak_prominence_min = models.FloatField(default=0.005)
    peak_prominence_max = models.FloatField(default=1.0)
    peak_distance = models.FloatField(default=5.0) # will need to convert this to int based on interpolation_indices
    peak_number_limit = models.IntegerField(default=1)
    peak_height_min = models.FloatField(default=0.005)
    peak_height_max = models.FloatField(default=1.0)
    peak_width_min = models.FloatField(default=0.1) # not actually used
    peak_width_max = models.FloatField(default=80.0) # not actually used
    peak_threshold_min = models.FloatField(default=0.005) # not actually used
    peak_threshold_max = models.FloatField(default=1.0) # not actually used

    smoothing_coefficient = models.FloatField(default=10) #percent

    difference_significance = models.FloatField(default=0.5)

    x_unit = models.TextField(default='°C')
    y_unit = models.TextField(default='AU')
    x_label = models.TextField(default='t')
    y_label = models.TextField(default='')

    class Meta:
        db_table = 'processing_settings'


# ProcessedDsfData? DEFUNCT
class ProcessedData(models.Model):
    experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
    processing_info = models.ForeignKey(ProcessingSettings, on_delete=models.CASCADE)
    raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # either in both sample info and here or neither

    pos = models.CharField(max_length=16) ##
    # all information required to make visuals should be made available here
    scatter_raw_x = ArrayField(models.FloatField())  ##
    scatter_raw_y = ArrayField(models.FloatField())  ##
    scatter_regularised_x = ArrayField(models.FloatField())  ## TODO: rename to regular for consistency
    scatter_regularised_y = ArrayField(models.FloatField())  ## TODO: rename to regular for consistency
    scatter_normalised_y = ArrayField(models.FloatField())  ## TODO: rename to normal for consistency
    scatter_smoothened_y = ArrayField(models.FloatField())  ## TODO: rename to smooth for consistency
    scatter_derivative_y = ArrayField(models.FloatField())  ## TODO: rename to first_der for consistency

    # only need distance and deviation from blank
    blank_difference = models.FloatField()
    blank_deviation = models.FloatField() # TODO: either remove or add other group processing here

    top_peak = models.FloatField()  ##
    all_peaks = ArrayField(models.FloatField())
    group = models.TextField() # this should be foreign key to groups? or not at all since it's in sample info
    hover_info = models.TextField() ## make in front end?

    ## TODO: add is_blank;

    class Meta:
        db_table = 'processed_data'
        ordering = ['pos']


class ProcessedDsfData(models.Model):
    experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
    processing_info = models.ForeignKey(ProcessingSettings, on_delete=models.CASCADE)
    raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # either in both sample info and here or neither

    pos = models.CharField(max_length=16)
    # all information required to make visuals should be made available here
    scatter_raw_x = ArrayField(models.FloatField())
    scatter_raw_y = ArrayField(models.FloatField())
    scatter_regular_x = ArrayField(models.FloatField())
    scatter_regular_y = ArrayField(models.FloatField())
    scatter_normal_y = ArrayField(models.FloatField())
    scatter_smooth_y = ArrayField(models.FloatField())
    scatter_first_der_y = ArrayField(models.FloatField())

    # only need distance and deviation from blank
    #diff_to_blank = models.FloatField()

    top_peak = models.FloatField()
    all_peaks = ArrayField(models.FloatField())

    #is_blank = models.BooleanField()

    class Meta:
        db_table = 'processed_dsf_data'
        ordering = ['pos']


class DefaultProcessingSettings(models.Model):
    name = models.CharField(max_length=100)
    notes = models.TextField()
    file_type = models.TextField()

    truncate_x_min = models.FloatField(default=15.0)
    truncate_x_max = models.FloatField(default=95.0)

    interpolation_indices = models.FloatField(default=0.1) # 0.1
    interpolation_method = models.CharField(max_length=100, default='linear') # 'linear'
    interpolation_order = models.IntegerField(default=1) # (can be empty)

    peak_mode = models.CharField(max_length=100, default='positive') # 'positive', 'negative', 'both'
    peak_derivative_of = models.CharField(max_length=100, default='normalised') # 'normalised', 'raw'
    peak_temp_limit_min = models.FloatField(default=15.0)
    peak_temp_limit_max = models.FloatField(default=95.0)
    peak_prominence_min = models.FloatField(default=0.005)
    peak_prominence_max = models.FloatField(default=1.0)
    peak_distance = models.FloatField(default=5.0) # will need to convert this to int based on interpolation_indices
    peak_number_limit = models.IntegerField(default=2)
    peak_height_min = models.FloatField(default=0.005)
    peak_height_max = models.FloatField(default=1.0)
    peak_width_min = models.FloatField(default=0.1) # not actually used
    peak_width_max = models.FloatField(default=80.0) # not actually used
    peak_threshold_min = models.FloatField(default=0.005) # not actually used
    peak_threshold_max = models.FloatField(default=1.0) # not actually used

    smoothing_coefficient = models.FloatField(default=10) #percent

    difference_significance = models.FloatField(default=0.5)

    x_unit = models.TextField(default='°C')
    y_unit = models.TextField(default='AU')
    x_label = models.TextField(default='t')
    y_label = models.TextField(default='')

    class Meta:
        db_table = 'default_processing_settings'

