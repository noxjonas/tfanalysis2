import time

import numpy as np
import pandas as pd
# from .models import Experiment, SampleInfo, ProcessingSettings, ProcessedDsfData
from .models import Experiments, SampleInfo, ProcessedTransitionData, RawData, TransitionProcessingSettings, PeakFindingSettings, PeakData
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

        # Prepare data for deposition into db
        self.postprocess()

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

    def postprocess(self):
        # Collate relevant info into df that would be stored in the database
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


#PeakFindingSettings, PeakData
class PeakFindingProcessor:
    """
        This processor only deals with peak finding

        It will create a dataframe which contains all of the peaks ordered by height of the peak (distance from 0)
        It also stores the heights in parallel

        TODO: implement curve comparison; use second derivative to determine range to be compared?
    """

    def __init__(self, experiment_id):

        # filter for data_type too; meaning first get processing settings
        experiment = Experiments.objects.get(pk=experiment_id)
        self.processing_settings = PeakFindingSettings.objects.filter(experiment=experiment).values()[0]
        self.transitions_df = pd.DataFrame(list(ProcessedTransitionData.objects.filter(
            experiment=experiment
        ).values()))

        self.preprocess()

        self.truncate()

        self.find_peaks()



    def preprocess(self):
        # Converts x- and y- arrays stored as 'lists' to df used for processing
        self.df = pd.DataFrame(columns=['pos', 'x', 'y'])
        for index, row in self.transitions_df.iterrows():
            temp_df = pd.DataFrame(data={
                'pos': [row['pos']]*len(row['regular_x']),
                'x': row['regular_x'],
                'y': row['first_der_y']
            })
            self.df = self.df.append(temp_df, ignore_index=True).reset_index(drop=True)


    def truncate(self):
        truncated = []
        for pos, df in self.df.groupby('pos'):
            new = df[df['x'] < self.processing_settings['limit_x_max']]
            new = new[new['x'] > self.processing_settings['limit_x_min']].reset_index(drop=True)
            truncated.append(new)
        self.df = pd.concat(truncated, sort=False, ignore_index=True).reset_index(drop=True)


    def find_peaks(self):
        # Should maintain a matrix of x, y? although y can always be calculated from x?
        def get_peak_dict(df_):
            df_ = df_.reset_index(drop=True)
            # Note that x here refers to scipy.signal.find_peaks attribute
            x = df_['y'].to_numpy()

            # Convert distance from x values to index
            # Simply get the number of indexes that span temperatures from min to min+peak_distance
            # Theoretically this only needs to be called once, but it is so fast it matters not
            # Also, do the same for peak widths
            distance = len(df_[df_['x'] < (df_['x'].min() + self.processing_settings['distance'])])
            width_min = len(df_[df_['x'] < (df_['x'].min() + self.processing_settings['width_min'])])
            width_max = len(df_[df_['x'] < (df_['x'].min() + self.processing_settings['width_max'])])

            peaks, properties = signal.find_peaks(
                x=x,
                height=[self.processing_settings['height_min'], self.processing_settings['height_max']],
                threshold=[self.processing_settings['threshold_min'], self.processing_settings['threshold_max']],
                distance=distance,
                prominence=[self.processing_settings['prominence_min'], self.processing_settings['prominence_max']],
                width=[width_min, width_max],
            )

            # Prep values
            peak_df = df_[df_.index.isin(peaks)].reset_index(drop=True)
            peak_df.index = np.arange(1, len(peak_df) + 1)
            peak_df = peak_df.sort_values(by='y', ascending=False).head(self.processing_settings['number_limit'])

            return {'pos': df_['pos'].unique()[0], 'x': peak_df['x'].tolist(), 'y': peak_df['y'].tolist(), 'index': list(peak_df.index)}

        df = self.df.copy()

        # Convert y values depending on peak_mode selection
        if self.processing_settings['peak_mode'] == 'positive':
            # Use data as is
            pass
        elif self.processing_settings['peak_mode'] == 'negative':
            # Multiply by -1
            df['y'] = df['y'] * -1
        elif self.processing_settings['peak_mode'] == 'both':
            # Get absolute values
            df['y'] = df['y'].abs()

        # Get rid of NaNs because peak finding gives random results. Although NaNs should not ever be here anyway?
        df = df.dropna()

        # Iterate over df grouped by 'pos' and populate list
        self.peak_list = []
        for pos, group_df in df.groupby('pos'):
            self.peak_list.append(get_peak_dict(group_df))

        self.result_df = pd.DataFrame.from_records(self.peak_list)










def test_peak_finding():
    start_time = time.time()

    experiment_id = 4


    processor = PeakFindingProcessor(experiment_id)
    # df = processor.result_df.copy()
    # processor.__del__()
    print('Peaks found in', (time.time() - start_time), 's')




# Can be launched via: python manage.py shell -c "from tfanalysis.processors import test; test_transition_processing()"
def test_transition_processing():
    start_time = time.time()

    experiment_id = 2

    processor = TransitionProcessor(experiment_id)
    df = processor.result_df.copy()
    processor.__del__()
    print('Data processed in', (time.time() - start_time), 's')


"""
    To compare the shapes of transitions:
        1. obtain min max of normalised data <- how do I ensure consistency without truncating? use second derivative to 
        2. fit curve; ignore multiple transitions at this stage; 
        3. translate along x axis until they are most similar
        4. ? get X axis range within when error is below certain standard deviation?
        5. revert back to normalised data (but translated)
        6. Calculate deviation from blank across all curve
        7. calculate local deviations for each peak
        8. could do this with first derivative for each peak, where y axis can be transformed?

"""