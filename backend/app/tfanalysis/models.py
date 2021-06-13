from django.db import models
from django.contrib.postgres.fields import ArrayField

from django.forms.models import model_to_dict


class ModelDiffMixin(object):
    """
    A model mixin that tracks model fields' values and provide some useful api
    to know what fields have been changed.
    """

    def __init__(self, *args, **kwargs):
        super(ModelDiffMixin, self).__init__(*args, **kwargs)
        self.__initial = self._dict

    @property
    def diff(self):
        d1 = self.__initial
        d2 = self._dict
        diffs = [(k, (v, d2[k])) for k, v in d1.items() if v != d2[k]]
        return dict(diffs)

    @property
    def has_changed(self):
        return bool(self.diff)

    @property
    def changed_fields(self):
        return self.diff.keys()

    def get_field_diff(self, field_name):
        """
        Returns a diff for field if it's changed and None otherwise.
        """
        return self.diff.get(field_name, None)

    def save(self, *args, **kwargs):
        """
        Saves model and set initial state.
        """
        super(ModelDiffMixin, self).save(*args, **kwargs)
        self.__initial = self._dict

    @property
    def _dict(self):
        return model_to_dict(self, fields=[field.name for field in
                                           self._meta.fields])


# TODO: add imported screens model

# TODO: all subsequent processing models should relate to previous data with on_delete.CASCADE

'''
‘nearest’, ‘zero’, ‘linear’, ‘quadratic’, ‘cubic’, ‘spline’, ‘barycentric’, ‘polynomial’: Passed to scipy.interpolate.interp1d. These methods use the numerical values of the index. Both ‘polynomial’ and ‘spline’ require that you also specify an order (int), e.g. df.interpolate(method='polynomial', order=5).

        TEMPORARY MODELS WHILE DOING SIGNIFICANT FIXING
'''
#Experiment DefaultProcessingSettings, ProcessingSettings, ProcessedDsfData
#
# class Experiment(models.Model):
#     id_a = models.IntegerField()
#
# class DefaultProcessingSettings(models.Model):
#     id_a = models.IntegerField()
#
# class ProcessingSettings(models.Model):
#     id_a = models.IntegerField()
#
# class ProcessedDsfData(models.Model):
#     id_a = models.IntegerField()
#
# class ProcessedData(models.Model):
#     id_a = models.IntegerField()


"""
        END
"""

class Parsers(models.Model):
    python_class_name = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    info = models.TextField()  # Explain what data it actually parses
    accepted_file_types = ArrayField(models.CharField(max_length=100))
    available_data_types = ArrayField(models.CharField(max_length=100))
    allow_data_merge = models.BooleanField()

    class Meta:
        db_table = 'parsers'

class Experiments(models.Model):
    parser = models.ForeignKey(Parsers, on_delete=models.CASCADE)
    uploaded = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    name = models.TextField()
    project = models.TextField(blank=True)
    user = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    screen = models.TextField(blank=True)
    instrument_info = models.JSONField(blank=True)
    parse_warnings = models.JSONField(blank=True)
    autoprocess = models.BooleanField(default=False)

    class Meta:
        db_table = 'experiments'
        ordering = ['-updated']


class InstrumentInfo(models.Model):
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE)
    data_json = models.JSONField()

    class Meta:
        db_table = 'instrument_info'


class RawData(models.Model):
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE)
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
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE)
    raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # do not use this?
    updated = models.DateTimeField(auto_now=True)
    pos = models.CharField(max_length=16)
    code = models.TextField(blank=True, null=True)
    name = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    buffer = models.TextField(blank=True, null=True)
    condition = models.TextField(blank=True, null=True)
    concentration = models.TextField(blank=True, null=True)
    unit = models.TextField(blank=True, null=True)
    group = models.TextField(blank=True, null=True)
    outlier = models.BooleanField(blank=True, null=True)
    blank = models.BooleanField(blank=True, null=True)

    class Meta:
        db_table = 'sample_info'
        ordering = ['pos']


class SampleInfoScreens(models.Model):
    screen_name = models.TextField()
    updated = models.DateTimeField()
    pos = models.CharField(max_length=16)
    code = models.TextField(blank=True, null=True)
    name = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    buffer = models.TextField(blank=True, null=True)
    condition = models.TextField(blank=True, null=True)
    concentration = models.TextField(blank=True, null=True)
    unit = models.TextField(blank=True, null=True)
    group = models.TextField(blank=True, null=True)
    outlier = models.BooleanField(blank=True, null=True)
    blank = models.BooleanField(blank=True, null=True)

    class Meta:
        db_table = 'sample_info_screens'
        ordering = ['-updated', 'screen_name', 'pos']



class DefaultTransitionProcessingSettings(models.Model):
    parser = models.ForeignKey(Parsers, on_delete=models.CASCADE)

    selected_data_type = models.TextField()

    truncate_x_min = models.FloatField()
    truncate_x_max = models.FloatField()

    # Now these should be various settings
    interpolation_indices = models.FloatField(default=0.1) # 0.1
    interpolation_method = models.CharField(max_length=100) # 'linear'
    interpolation_order = models.IntegerField(default=1) # (can be empty)

    filter_type = models.CharField(max_length=50)  # 'savgol', 'filtfilt'
    savgol_smoothing_coefficient = models.FloatField(default=10, blank=True) # percent of data
    filtfilt_n = models.IntegerField(default=1, blank=True)
    filtfilt_wn = models.FloatField(default=0.025, blank=True)

    data_to_derive = models.CharField(max_length=100, default='normal') # 'normal', 'raw'
    derivative_period = models.IntegerField() # default 1

    x_unit = models.TextField(default='°C', blank=True)
    y_unit = models.TextField(default='AU', blank=True)
    x_label = models.TextField(default='t', blank=True)
    y_label = models.TextField(default='', blank=True)

    class Meta:
        db_table = 'default_transition_processing_settings'


class TransitionProcessingSettings(models.Model, ModelDiffMixin):
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE)  # I will also get sample info from this
    default_settings = models.ForeignKey(DefaultTransitionProcessingSettings, on_delete=models.CASCADE)
    updated = models.DateTimeField(auto_now=True)

    data_types_available = ArrayField(models.TextField())
    selected_data_type = models.TextField()

    truncate_x_min = models.FloatField()
    truncate_x_max = models.FloatField()

    # Now these should be various settings
    interpolation_indices = models.FloatField() # 0.1
    interpolation_method = models.CharField(max_length=100) # 'linear'
    interpolation_order = models.IntegerField() # (can be empty)

    filter_type = models.CharField(max_length=50)  # 'savgol', 'filtfilt'
    savgol_smoothing_coefficient = models.FloatField(blank=True) # percent of data
    filtfilt_n = models.IntegerField(blank=True)
    filtfilt_wn = models.FloatField(blank=True)

    data_to_derive = models.CharField(max_length=100) # 'normal', 'raw'
    # TODO: could change this to float field and take in x axis instead of period: easier to understand
    derivative_period = models.IntegerField() # default 1

    x_unit = models.TextField(blank=True)
    y_unit = models.TextField(blank=True)
    x_label = models.TextField(blank=True)
    y_label = models.TextField(blank=True)

    class Meta:
        db_table = 'transition_processing_settings'


class ProcessedTransitionData(models.Model):
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE)
    processing_settings = models.ForeignKey(TransitionProcessingSettings, on_delete=models.CASCADE)
    raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # either in both sample info and here or neither

    pos = models.CharField(max_length=16)
    # all information required to make visuals should be made available here
    # raw is repeated here because it can be truncated; could also just truncate when called? easier to serialise tho
    raw_x = ArrayField(models.FloatField())
    raw_y = ArrayField(models.FloatField())
    regular_x = ArrayField(models.FloatField())
    regular_y = ArrayField(models.FloatField())
    normal_y = ArrayField(models.FloatField())
    smooth_y = ArrayField(models.FloatField())
    first_der_y = ArrayField(models.FloatField())

    class Meta:
        db_table = 'processed_transition_data'
        ordering = ['pos']


class DefaultPeakFindingSettings(models.Model):
    parser = models.ForeignKey(Parsers, on_delete=models.CASCADE)

    limit_x_min = models.FloatField()
    limit_x_max = models.FloatField()

    peak_mode = models.CharField(max_length=100, default='positive')  # 'positive', 'negative', 'both'

    number_limit = models.IntegerField(default=1)

    prominence_min = models.FloatField(default=0.005)
    prominence_max = models.FloatField(default=1.0)
    distance = models.FloatField(default=5.0) # will need to convert this to int based on interpolation_indices
    height_min = models.FloatField(default=0.005)
    height_max = models.FloatField(default=1.0)
    width_min = models.FloatField(default=0.1) # not actually used
    width_max = models.FloatField(default=80.0) # not actually used
    threshold_min = models.FloatField(default=0.005) # not actually used
    threshold_max = models.FloatField(default=1.0) # not actually used

    # top_peak_logic = models.CharField(max_length=50)  # One of: 'highest', 'smallest', 'leftmost', 'rightmost' or 'index'
    # top_peak_logic_index = models.IntegerField(blank=True, default=0)

    class Meta:
        db_table = 'default_peak_finding_settings'

# TODO: rename to peak finding; processing will deal with peak selection
class PeakFindingSettings(models.Model, ModelDiffMixin):
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE) # I will also get sample info from this
    default_settings = models.ForeignKey(DefaultPeakFindingSettings, on_delete=models.CASCADE)
    updated = models.DateTimeField(auto_now=True)

    limit_x_min = models.FloatField()
    limit_x_max = models.FloatField()

    peak_mode = models.CharField(max_length=100)

    number_limit = models.IntegerField()

    prominence_min = models.FloatField()
    prominence_max = models.FloatField()
    distance = models.FloatField() # will need to convert this to int based on interpolation_indices
    height_min = models.FloatField()
    height_max = models.FloatField()
    width_min = models.FloatField() # not actually used
    width_max = models.FloatField() # not actually used
    threshold_min = models.FloatField() # not actually used
    threshold_max = models.FloatField() # not actually used

    # top_peak_logic = models.CharField(max_length=50)  # 'fastest', 'slowest', 'leftmost', 'rightmost', 'index'
    # top_peak_logic_index = models.IntegerField(blank=True)

    class Meta:
        db_table = 'peak_finding_settings'


class PeakData(models.Model):
    experiment = models.ForeignKey(Experiments, on_delete=models.CASCADE)
    processing_settings = models.ForeignKey(PeakFindingSettings, on_delete=models.CASCADE)
    transition_data = models.ForeignKey(ProcessedTransitionData, on_delete=models.CASCADE) # either in both sample info and here or neither

    pos = models.CharField(max_length=16)

    x = ArrayField(models.FloatField(), null=True, blank=True)
    y = ArrayField(models.FloatField(), null=True, blank=True)
    index = ArrayField(models.IntegerField(), null=True, blank=True)

    class Meta:
        db_table = 'peak_data'
        ordering = ['pos']







# TODO: keep for defaults; delete later
# class TransitionProcessingSettings(models.Model):
#     experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE) # I will also get sample info from this
#     updated = models.DateTimeField(auto_now=True)
#     selected_data_type = models.TextField()
#
#     truncate_x_min = models.FloatField()
#     truncate_x_max = models.FloatField()
#
#     # Now these should be various settings
#     interpolation_indices = models.FloatField(default=0.1) # 0.1
#     interpolation_method = models.CharField(max_length=100) # 'linear'
#     interpolation_order = models.IntegerField(default=1) # (can be empty)
#
#     smoothing_coefficient = models.FloatField(default=10) #percent
#
#     peak_mode = models.CharField(max_length=100, default='positive') # 'positive', 'negative', 'both'
#     peak_derivative_of = models.CharField(max_length=100, default='normalised') # 'normalised', 'raw'
#     peak_temp_limit_min = models.FloatField(default=15.0)
#     peak_temp_limit_max = models.FloatField(default=95.0)
#     peak_prominence_min = models.FloatField(default=0.005)
#     peak_prominence_max = models.FloatField(default=1.0)
#     peak_distance = models.FloatField(default=5.0) # will need to convert this to int based on interpolation_indices
#     peak_number_limit = models.IntegerField(default=1)
#     peak_height_min = models.FloatField(default=0.005)
#     peak_height_max = models.FloatField(default=1.0)
#     peak_width_min = models.FloatField(default=0.1) # not actually used
#     peak_width_max = models.FloatField(default=80.0) # not actually used
#     peak_threshold_min = models.FloatField(default=0.005) # not actually used
#     peak_threshold_max = models.FloatField(default=1.0) # not actually used
#
#     x_unit = models.TextField(default='°C', blank=True)
#     y_unit = models.TextField(default='AU', blank=True)
#     x_label = models.TextField(default='t', blank=True)
#     y_label = models.TextField(default='', blank=True)
#
#     class Meta:
#         db_table = 'transition_processing_settings'








'''
    These will be made obsolete

'''
# # ProcessedDsfData? DEFUNCT
# class ProcessedData(models.Model):
#     experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
#     processing_info = models.ForeignKey(TransitionProcessingSettings, on_delete=models.CASCADE)
#     raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # either in both sample info and here or neither
#
#     pos = models.CharField(max_length=16) ##
#     # all information required to make visuals should be made available here
#     scatter_raw_x = ArrayField(models.FloatField())  ##
#     scatter_raw_y = ArrayField(models.FloatField())  ##
#     scatter_regularised_x = ArrayField(models.FloatField())  ## TODO: rename to regular for consistency
#     scatter_regularised_y = ArrayField(models.FloatField())  ## TODO: rename to regular for consistency
#     scatter_normalised_y = ArrayField(models.FloatField())  ## TODO: rename to normal for consistency
#     scatter_smoothened_y = ArrayField(models.FloatField())  ## TODO: rename to smooth for consistency
#     scatter_derivative_y = ArrayField(models.FloatField())  ## TODO: rename to first_der for consistency
#
#     # only need distance and deviation from blank
#     blank_difference = models.FloatField()
#     blank_deviation = models.FloatField() # TODO: either remove or add other group processing here
#
#     top_peak = models.FloatField()  ##
#     all_peaks = ArrayField(models.FloatField())
#     group = models.TextField() # this should be foreign key to groups? or not at all since it's in sample info
#     hover_info = models.TextField() ## make in front end?
#
#     ## TODO: add is_blank;
#
#     class Meta:
#         db_table = 'processed_data'
#         ordering = ['pos']
#
# class ProcessedDsfData(models.Model):
#     experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
#     processing_info = models.ForeignKey(ProcessingSettings, on_delete=models.CASCADE)
#     raw_data = models.ForeignKey(RawData, on_delete=models.CASCADE) # either in both sample info and here or neither
#
#     pos = models.CharField(max_length=16)
#     # all information required to make visuals should be made available here
#     scatter_raw_x = ArrayField(models.FloatField())
#     scatter_raw_y = ArrayField(models.FloatField())
#     scatter_regular_x = ArrayField(models.FloatField())
#     scatter_regular_y = ArrayField(models.FloatField())
#     scatter_normal_y = ArrayField(models.FloatField())
#     scatter_smooth_y = ArrayField(models.FloatField())
#     scatter_first_der_y = ArrayField(models.FloatField())
#
#     # only need distance and deviation from blank
#     #diff_to_blank = models.FloatField()
#
#     top_peak = models.FloatField()
#     all_peaks = ArrayField(models.FloatField())
#
#     #is_blank = models.BooleanField()
#
#     class Meta:
#         db_table = 'processed_dsf_data'
#         ordering = ['pos']
#
#
# class DefaultProcessingSettings(models.Model):
#     name = models.CharField(max_length=100)
#     notes = models.TextField()
#     file_type = models.TextField()
#
#     truncate_x_min = models.FloatField(default=15.0)
#     truncate_x_max = models.FloatField(default=95.0)
#
#     interpolation_indices = models.FloatField(default=0.1) # 0.1
#     interpolation_method = models.CharField(max_length=100, default='linear') # 'linear'
#     interpolation_order = models.IntegerField(default=1) # (can be empty)
#
#     peak_mode = models.CharField(max_length=100, default='positive') # 'positive', 'negative', 'both'
#     peak_derivative_of = models.CharField(max_length=100, default='normalised') # 'normalised', 'raw'
#     peak_temp_limit_min = models.FloatField(default=15.0)
#     peak_temp_limit_max = models.FloatField(default=95.0)
#     peak_prominence_min = models.FloatField(default=0.005)
#     peak_prominence_max = models.FloatField(default=1.0)
#     peak_distance = models.FloatField(default=5.0) # will need to convert this to int based on interpolation_indices
#     peak_number_limit = models.IntegerField(default=2)
#     peak_height_min = models.FloatField(default=0.005)
#     peak_height_max = models.FloatField(default=1.0)
#     peak_width_min = models.FloatField(default=0.1) # not actually used
#     peak_width_max = models.FloatField(default=80.0) # not actually used
#     peak_threshold_min = models.FloatField(default=0.005) # not actually used
#     peak_threshold_max = models.FloatField(default=1.0) # not actually used
#
#     smoothing_coefficient = models.FloatField(default=10) #percent
#
#     difference_significance = models.FloatField(default=0.5)
#
#     x_unit = models.TextField(default='°C')
#     y_unit = models.TextField(default='AU')
#     x_label = models.TextField(default='t')
#     y_label = models.TextField(default='')
#
#     class Meta:
#         db_table = 'default_processing_settings'
#
# class ProcessingSettings(models.Model):
#     experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE) # I will also get sample info from this
#     updated = models.DateTimeField(auto_now=True)
#     selected_data_type = models.TextField()
#
#     #blanks = ArrayField(models.CharField(max_length=16)) # Should take these from sample info
#     #flat_blank = models.FloatField(blank=True, null=True) # TODO: If blank is set as a number; allow null to determine if used
#     #blank_average = models.FloatField() # Equals to flat_blank if there are no actual blanks specified
#     skip_outliers = models.BooleanField(default=True)  # TODO: this should not affect processing, only viewing
#
#     truncate_x_min = models.FloatField()
#     truncate_x_max = models.FloatField()
#
#     # Now these should be various settings
#     interpolation_indices = models.FloatField(default=0.1) # 0.1
#     interpolation_method = models.CharField(max_length=100) # 'linear'
#     interpolation_order = models.IntegerField(default=1) # (can be empty)
#
#     peak_mode = models.CharField(max_length=100, default='positive') # 'positive', 'negative', 'both'
#     peak_derivative_of = models.CharField(max_length=100, default='normalised') # 'normalised', 'raw'
#     peak_temp_limit_min = models.FloatField(default=15.0)
#     peak_temp_limit_max = models.FloatField(default=95.0)
#     peak_prominence_min = models.FloatField(default=0.005)
#     peak_prominence_max = models.FloatField(default=1.0)
#     peak_distance = models.FloatField(default=5.0) # will need to convert this to int based on interpolation_indices
#     peak_number_limit = models.IntegerField(default=1)
#     peak_height_min = models.FloatField(default=0.005)
#     peak_height_max = models.FloatField(default=1.0)
#     peak_width_min = models.FloatField(default=0.1) # not actually used
#     peak_width_max = models.FloatField(default=80.0) # not actually used
#     peak_threshold_min = models.FloatField(default=0.005) # not actually used
#     peak_threshold_max = models.FloatField(default=1.0) # not actually used
#
#     smoothing_coefficient = models.FloatField(default=10) #percent
#
#     difference_significance = models.FloatField(default=0.5)
#
#     x_unit = models.TextField(default='°C', blank=True)
#     y_unit = models.TextField(default='AU', blank=True)
#     x_label = models.TextField(default='t', blank=True)
#     y_label = models.TextField(default='', blank=True)
#
#     class Meta:
#         db_table = 'processing_settings'
