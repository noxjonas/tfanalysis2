import time

import numpy as np
import pandas as pd
from .models import Experiment, SampleInfo, ProcessingSettings, ProcessedDsfData
from .models import ProcessedTransitionData, RawData, TransitionProcessingSettings,Experiments
import json
from scipy import signal
from django.db import connection
pd.options.display.max_rows = 20
pd.options.display.max_columns = 20

from django import db

import os, psutil
#plt.close("all")
import matplotlib.pyplot as plt
#TODO: Capture errors to send back to front-end



class TransitionProcessor:

    def __init__(self, experiment_id, pos_filter=None):
        """
            This processor only deals with transition data.
            It retrieves relevant data objects based on experiment_id and optional filter of which positions to process

            Generally each function works on the entire dataframe though it could be more streamlined
        """

        # filter for data_type too; meaning first get processing settings
        experiment = Experiments.objects.get(pk=experiment_id)
        self.processing_settings = TransitionProcessingSettings.objects.filter(experiment=experiment).values()[0]
        self.raw_data_df = pd.DataFrame(list(RawData.objects.filter(
            experiment=experiment,
            data_type=self.processing_settings['selected_data_type'],
        ).values()))

        # print('Processing datas:', 'experiment_id', experiment_id)
        # print('raw_data_df', raw_data_df)
        #print('processing_settings', processing_settings)

        # Filter for positions if specified
        if pos_filter is not None:
            self.raw_data_df = self.raw_data_df.query('pos in @pos_filter')

        # Convert raw data from database entries into usable dfs
        self.preprocess()

        # Regularise the raw data
        self.regularise()

        # Truncate the data
        # TODO: a checkbox to implement perhaps? Since this will always limit the data to x in 0-100 range
        self.truncate()

        # Smoothen the regular data
        self.regular_df['smooth_y'] = self.smoothen(
            df=self.regular_df,
            column='regular_y',
        )

        # Normalise the smoothened data
        self.regular_df['normal_y'] = self.regular_df.groupby('pos')['smooth_y'].transform(
            lambda x: (x - x.min()) / (np.ptp(x.to_numpy()))
        )

        # Calculate derivative
        # TODO: Select active data to derive and peak find based on 'data_to_derive'
        if self.processing_settings['data_to_derive'] == 'normal':
            self.calc_derivative(column='normal_y')
        elif self.processing_settings['data_to_derive'] == 'raw':
            self.calc_derivative(column='regular_y')




        # Smoothen derivatives
        # Need to get rid of NaNs when smoothing the data (may be a result of calculating derivative)
        self.regular_df.dropna(inplace=True)
        self.regular_df['first_der_y'] = self.smoothen(
            df=self.regular_df,
            column='first_der_y'
        )

        # Truncate if needed TODO: Implement truncation and/or limits for peak finding

        # # And now find the peaks TODO: move to a separate class
        # self.find_peaks(self.regular_df)
        #
        # # Generate dict for blank info
        # self.calc_blank_info()

        # Prepare data for deposition into db
        self.postprocess()

        # Helper testing function
        # self.make_plot_png()

    def preprocess(self):
        # Converts x- and y- arrays stored as 'lists' to df used for processing
        self.irregular_df = pd.DataFrame(columns=['pos', 'raw_x', 'raw_y'])
        for index, row in self.raw_data_df.iterrows():
            temp_df = pd.DataFrame(data={
                'pos': [row['pos']]*len(row['raw_x']),
                'raw_x': row['raw_x'],
                'raw_y': row['raw_y']
            })
            self.irregular_df = self.irregular_df.append(temp_df, ignore_index=True).reset_index(drop=True)
        # TODO: Remove
        # if self.processing_settings['skip_outliers'] is True:
        #     # Get positions and filter values that are outliers
        #     df = self.sample_info_df[self.sample_info_df['manual_outlier'] == True].copy()
        #     outliers = df['pos'].to_list()
        #     self.irregular_df = self.irregular_df.query('pos not in @outliers')


    def regularise(self):
        # Regularise data based on settings: 'interpolation_indices', 'interpolation_method', 'interpolation_order'
        def regularise_sample(df):
            # Note original x values that will be removed
            x_values = df['raw_x'].to_numpy()

            # Make array to interpolate
            start = np.floor(df['raw_x'].min())
            end = np.ceil(df['raw_x'].max())
            number = (end-start) / self.processing_settings['interpolation_indices']
            array = start + np.arange(number) * self.processing_settings['interpolation_indices']
            array = array[np.logical_and(df['raw_x'].min() < array, array < df['raw_x'].max())]
            # Round to 2 decimals
            array = np.around(array, decimals=2)

            # Add to df and drop duplicate x
            df = df.append(pd.DataFrame(data={
                'pos': [df['pos'].unique().tolist()[0]] * array.size,
                'raw_x': array,
                'raw_y': [np.nan] * array.size
            }), ignore_index=True)\
                .drop_duplicates(subset=['raw_x'], keep='first').sort_values('raw_x').reset_index(drop=True)

            # Interpolate values
            if self.processing_settings['interpolation_method'] in ['spline', 'polynomial']:
                df = df.interpolate(
                    method=self.processing_settings['interpolation_method'],
                    order=self.processing_settings['interpolation_order']
                )
            else:
                df = df.interpolate(method=self.processing_settings['interpolation_method'])

            # Remove non-regular values. But don't remove raw value if it did not need to be interpolated
            x_values = np.setdiff1d(x_values, array)
            df = df[~df['raw_x'].isin(x_values)]

            return df

        temp_df = pd.DataFrame(columns=['pos', 'raw_x', 'raw_y'])
        for group_pos, group_df in self.irregular_df.groupby('pos'):
            temp_df = temp_df.append(
                regularise_sample(group_df), ignore_index=True
            ).reset_index(drop=True)
        self.regular_df = temp_df.rename(columns={'raw_x': 'regular_x', 'raw_y': 'regular_y'})


    def truncate(self):

        # TODO: Could write this as small loop?
        truncated = []
        for group, df in self.irregular_df.groupby('pos'):
            new = df[df['raw_x'] < self.processing_settings['truncate_x_max']]
            new = new[new['raw_x'] > self.processing_settings['truncate_x_min']].reset_index(drop=True)
            truncated.append(new)
        self.irregular_df = pd.concat(truncated, sort=False, ignore_index=True).reset_index(drop=True)

        truncated = []
        for group, df in self.regular_df.groupby('pos'):
            new = df[df['regular_x'] < self.processing_settings['truncate_x_max']]
            new = new[new['regular_x'] > self.processing_settings['truncate_x_min']].reset_index(drop=True)
            truncated.append(new)
        self.regular_df = pd.concat(truncated, sort=False, ignore_index=True).reset_index(drop=True)


    def smoothen(self, df, column):

        def savgol(series):
            # Convert to np array since groupby returns Series object
            x = np.array(series)

            # Calculate smoothing window
            average_len = len(series) * (self.processing_settings['savgol_smoothing_coefficient']/100)

            # Arbitrarily use floor vs ceil to get an odd integer
            smoothing_window_length = int(np.floor(average_len) // 2 * 2 + 1)

            return signal.savgol_filter(
                x=x,
                window_length=smoothing_window_length,
                polyorder=1,
                deriv=0
            )

        def filtfilt(series):
            # Convert series to array
            x = np.array(series)

            # Construct filter coefficient and return filtered data
            sos = signal.butter(
                N=self.processing_settings['filtfilt_n'],
                Wn=self.processing_settings['filtfilt_wn'],
                output='sos'
            )

            return signal.sosfiltfilt(sos, x)

        # Apply one of the filters
        if self.processing_settings['filter_type'] == 'savgol':
            return np.array(df.groupby('pos')[column].transform(savgol))

        elif self.processing_settings['filter_type'] == 'filtfilt':
            return np.array(df.groupby('pos')[column].transform(filtfilt))

    def calc_derivative(self, column):
        period = self.processing_settings['derivative_period']
        self.regular_df['first_der_y'] = self.regular_df.groupby('pos')[column].transform(
            lambda x: x.diff(periods=period) / x.index.to_series().diff(periods=period)
        )
    #
    # def find_peaks(self, df):
    #     # How are peak results outputed?
    #     # Should maintain a matrix of x, y? although y can always be calculated from x?
    #     def get_peak_list(df_):
    #         df_ = df_.reset_index(drop=True)
    #         x = df_['first_der_y'].to_numpy()
    #         settings = self.processing_settings
    #
    #         # Convert distance from temperature to indices
    #         # Simply get the number of indexes that span temperatures from min to min+peak_distance
    #         # Theoretically this only needs to be called once, but it is so fast it matters not
    #         distance = len(df_[df_['regular_x'] < (df_['regular_x'].min() + settings['peak_distance'])])
    #
    #         peaks, properties = signal.find_peaks(
    #             x=x,
    #             height=[settings['peak_height_min'], settings['peak_height_max']],
    #             # threshold=[settings['peak_threshold_min'], settings['peak_threshold_max']],  # TODO: Place in frontend
    #             distance=distance,
    #             prominence=[settings['peak_prominence_min'], settings['peak_prominence_max']],
    #             # width=[settings['peak_width_min'], settings['peak_width_max']],  # TODO: Place in frontend
    #         )
    #
    #         df_ = df_[df_.index.isin(peaks)].sort_values(by='first_der_y', ascending=False)\
    #             .head(settings['peak_number_limit'])
    #
    #         return df_['regular_x'].to_list()
    #
    #     df = df[['pos', 'regular_x', 'first_der_y']].copy()
    #
    #     # Conditional to convert y (or not)
    #     if self.processing_settings['peak_mode'] == 'positive':
    #         # Use data as is
    #         pass
    #     elif self.processing_settings['peak_mode'] == 'negative':
    #         # Multiply by -1
    #         df['first_der_y'] = df['first_der_y'] * -1
    #     elif self.processing_settings['peak_mode'] == 'both':
    #         # Get absolute values
    #         df['first_der_y'] = df['first_der_y'].abs()
    #
    #     # Get rid of NaNs because peak finding gives random results. But previous processing returns proper df so far.
    #     df = df.dropna()
    #
    #     # Iterate over df grouped by 'pos' and populate dict
    #     self.all_peak_dict = dict()  # {'pos': [x, .., x], ..} # list len may vary
    #     for group_pos, group_df in df.groupby('pos'):
    #         self.all_peak_dict[group_pos] = get_peak_list(group_df)
    #
    #     # Now make a top peak dict for db and further calculations
    #     self.top_peak_dict = {
    #         k: (v[0] if len(v) > 0 else 0) for k, v in self.all_peak_dict.items()
    #     }
    #
    #
    # def calc_blank_info(self):
    #     # Make dicts for: which is blank and deviations from blank average
    #     # TODO: Far in the future may implement selection of peaks
    #
    #     # Determine whether there are any blanks
    #     blank_df = self.sample_info_df[self.sample_info_df['is_blank'] == True].copy()
    #
    #     # TODO: this could be implemented better; currently flat blank is only used if no blanks are selected
    #     if len(blank_df) == 0:
    #         self.blank_average = 0.0
    #
    #     else:
    #         # Retrieve top peak values
    #         blank_values = [v for k, v in self.top_peak_dict.items() if k in blank_df['pos'].to_list()]
    #         # Remove NaNs
    #         blank_values = [i for i in blank_values if str(i) != 'nan']
    #         # Check if it's not empty
    #         if len(blank_values) != 0:
    #             self.blank_average = sum(blank_values)/len(blank_values)
    #         #Default to 0.0 otherwise
    #         else:
    #             self.blank_average = 0.0
    #
    #     self.blank_average = round(self.blank_average, 2)
    #
    #     self.blank_diff_dict = {
    #         k: (round(v-self.blank_average, 2) if str(v) != 'nan' else np.nan) for k, v in self.top_peak_dict.items()
    #     }
    #
    #     self.is_blank_dict = {
    #         row['pos']: row['is_blank'] for index, row in self.sample_info_df.iterrows()
    #     }

    def postprocess(self):
        # Collate relevant info into df that would be stored in the database
        # ['pos', 'scatter_raw_x', 'scatter_raw_y', 'scatter_regular_x', 'scatter_regular_y',
        #  'scatter_normal_y', 'scatter_smooth_y', 'scatter_first_der_y', 'diff_to_blank', 'top_peak', 'is_blank']

        record_list = []
        for pos, group_df in self.regular_df.groupby('pos'):

            entry_dict = {
                    'pos': pos,
                    'raw_x': self.irregular_df.loc[self.irregular_df['pos'] == pos]['raw_x'].to_list(),
                    'raw_y': self.irregular_df.loc[self.irregular_df['pos'] == pos]['raw_y'].to_list(),
                    'regular_x': group_df['regular_x'].to_list(),
                    'regular_y': group_df['regular_y'].to_list(),
                    'normal_y': group_df['normal_y'].to_list(),
                    'smooth_y': group_df['smooth_y'].to_list(),
                    'first_der_y': group_df['first_der_y'].to_list(),
                }
            record_list.append(entry_dict)

        self.result_df = pd.DataFrame.from_records(record_list)

    def __del__(self):
        class_name = self.__class__.__name__
        print(class_name, "destroyed")

    def make_plot_png(self):
        # print('self.regular_df', self.regular_df)
        df = self.regular_df
        plt.figure()
        df.set_index('regular_x', inplace=True)
        df.groupby('pos')['first_der_y'].plot(legend=True)
        plt.savefig('test.png')





















# Can be launched via: python manage.py shell -c "from tfanalysis.processors import test; test()"
def test():
    start_time = time.time()

    experiment_id = 2


    processor = TransitionProcessor(experiment_id)
    df = processor.result_df.copy()
    processor.__del__()
    print('Data processed in', (time.time() - start_time), 's')
    #
    # experiment_obj = Experiment.objects.get(id=experiment_id)
    # processing_settings_obj = ProcessingSettings.objects.get(id=processing_settings['id'])
    # print('experiment_obj', experiment_obj, 'processing_settings_obj', processing_settings_obj)
    #
    # raw_data_objs = RawData.objects.filter(
    #     experiment_id=experiment_id,
    #     data_type=processing_settings['selected_data_type'],
    # )
    # #
    # # This might not be needed since ordering is conserved
    # # However, in light of being explicit over implicit - objects are explicitly mapped to pos
    #
    # raw_data_obj_dict = {}
    # for i in raw_data_objs:
    #     raw_data_obj_dict[i.pos] = i
    #
    # db_add_time = time.time()
    # for index, row in df.iterrows():
    #
    #     obj, created = ProcessedDsfData.objects.update_or_create(
    #         # These ensure uniqueness
    #         experiment=experiment_obj,
    #         processing_info=processing_settings_obj,
    #         raw_data=raw_data_obj_dict[row['pos']],
    #         pos=row['pos'],
    #
    #         # These are the values added, or changed if objects already exist
    #         defaults={
    #             'scatter_raw_x': row['scatter_raw_x'],
    #             'scatter_raw_y': row['scatter_raw_y'],
    #             'scatter_regular_x': row['scatter_regular_x'],
    #             'scatter_regular_y': row['scatter_regular_y'],
    #             'scatter_normal_y': row['scatter_normal_y'],
    #             'scatter_smooth_y': row['scatter_smooth_y'],
    #             'scatter_first_der_y': row['scatter_first_der_y'],
    #             'all_peaks': row['all_peaks'],
    #             'top_peak': row['top_peak'],
    #         },
    #     )
    #     db.reset_queries()
    #     print('Adding single entry takes', (time.time() - db_add_time), 's.')
    #     db_add_time = time.time()
    #
    # print('Memory usage after:', psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2)
    #
    # execution_time = (time.time() - start_time)
    # print('\nFinished in', str(execution_time)+'s')

