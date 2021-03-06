import pandas as pd
import numpy as np
import string
import re
import json

pd.options.display.max_rows = 20
pd.options.display.max_columns = 20

"""
    Things to do:
        1. Auto-register parsers on server start-up - defined in apps.py
        2. Assign default processing settings for transitions and peaks
        3. Implement router for parsing based on user selection
"""


class ParserRouter:

    pass


class DummyParser:
    """
        Boilerplate for a parser

        Three settings must be specified:
            1. Registration settings. Each parser here is instantiated upon running Django, adding it to the database.
            2. Default transition processing settings as a dictionary.
            3. Default peak finding settings as a dictionary.
            ! Use the same types (string, int, float, boolean) as in examples below!
            ! Do not remove or include any other keys in these dictionaries!

        __init__ method must accept a single paths argument, which is a list of paths pointing to the uploaded files.
        __init__ must also construct a pandas dataframe available through self.df. Requirements for it are defined below.
        (Optional) Instrument info can be provided for the run, which will be displayed on frontend.

    """
    parser_registration_settings = {
        # Must be different to all other parsers. Displayed in dropdown to users.
        'name': 'Dummy parser',
        # Explains to users what data it parses.
        'info': 'This parser is not functional and will not parse any data',
        # Helps prevent users from unnecessarily uploading wrong files. Must be a list with at least one entry.
        'accepted_file_types': ['csv', 'xlsx', 'customextension'],
        # Registers data sources available for each sample. Must be a list with at least one entry.
        'available_data_types': ['fluorescence', 'light_scattering'],
        # Informs user whether multiple datasets can be merged together with this parser
        'allow_data_merge': True
    }

    default_transition_processing_settings = {
        # Used to filter datasets based on the source. Must be included in the above 'available_data_types' list
        'selected_data_type': 'fluorescence',

        'truncate_x_min': 0,
        'truncate_x_max': 100,
        'interpolation_indices': 0.1,
        'interpolation_method': 'linear',  # One of: 'linear', 'quadratic', 'cubic', 'spline', 'polynomial'
        'interpolation_order': 1,  # Only relevant to 'spline' and 'polynomial' methods, but must be specified here

        'filter_type': 'filtfilt',  # Currently supports 'savgol' or 'filtfilt'
        'savgol_smoothing_coefficient': 10,  # Percentage of data
        'filtfilt_n': 1,  # See scipy.signal.butter N
        'filtfilt_wn': 0.025,  # See scipy.signal.butter Wn

        'data_to_derive': 'normal',  # 'normal' or 'raw'
        'derivative_period': 1,

        'x_unit': '??C',
        'y_unit': 'AU',
        'x_label': 't',
        'y_label': ''
    }

    default_peak_finding_settings = {
        'limit_x_min': 0,
        'limit_x_max': 100,

        'peak_mode': 'positive',  # One of 'positive', 'negative' or 'both'

        'number_limit': 1,  # Max number of peaks returned. This is based on peak height

        # See scipy.signal.find_peaks
        'prominence_min': 0.0001,
        'prominence_max': 0.1,
        # Note that this takes distance in terms of data values. Processor auto adjusts to int based on interpolation indices.
        'distance': 5.0,
        'height_min': 0.0002,
        'height_max': 0.1,
        'width_min': 0,  # Currently not used but is mandatory. TODO: probably need to do the same as with distance?
        'width_max': 100,  # Currently not used but is mandatory. TODO: probably need to do the same as with distance?
        'threshold_min': 0,  # Currently not used but is mandatory.
        'threshold_max': 0.1,  # Currently not used but is mandatory.

        # 'top_peak_logic': 'highest',  # One of: 'highest', 'smallest', 'leftmost', 'rightmost' or 'index'
        # 'top_peak_logic_index': 0,  # Integer index. Used to index a list (i.e. starts at 0)
    }

    def __init__(self, paths):
        """
            Parse each file in the list of paths.
            Multiple files don't have to be supported...
                But one may want to parse multiple files for data describing identical samples.
                In such cases, logic for identifying which file is which should be handled here.

            Constructed self.df must describe one sample dataset per row and contain the following columns:
                'pos': string identifier for the position of the sample. Note that samples are sorted using this value,
                    which is why you should use 'A01', '001' instead of 'A1', '1'.
                'data_type': string source of the data. Must be registered in parser_registration_settings dict.
                    Together, pos and data_type must ensure uniqueness of each sample.

                'col_index': integer positional index for column, starting at 0.
                'row_index': integer positional index for row, starting at 0.
                    Together, col_index and row_index describe how the samples are arranged on heatmap. Therefore,
                    these indexes, in combination with data_type, must also be unique per sample.

                'raw_x': list (or numpy.ndarray) of float values on the x axis. (Yes, you can store a list in pandas dataframe!)
                'raw_y': list (or numpy.ndarray) of float values on the y axis.
                    Both raw_x and raw_y must have the same length per sample. Separate samples can have different
                    length data. Storing NaN values is not allowed and they must either be removed or interpolated here.
                    Remember that data on the x axis should be sorted (low to high) to avoid visualisation errors.

            (Optional) You can provide instrument info (such as settings used during a run) in the form of dict.
            It will be displayed together with experiment info if self.intrument_info is created during __init__.
            Both keys and values must be strings.
            Note that instrument info dict will be converted to a  JSON object.

            (Optional) You can also provide a self.warnings dictionary. This will be parsed and displayed in front end.
            Do note that these are not fatal errors, rather should be used to inform if certain samples were not found
            or were bypassed. Dictionary must contain warning names as keys and values as lists (even if it's a single
            warning). Both keys and contents within the value (list) must be strings.

            If you expect to encounter a fatal error when parsing data, raise an Exception instead:
                raise Exception('<br>'.join(['You can display', 'your errors', 'each on new line', 'if you wish']))

            Note that outputs from parsers are passed through a validator - class ParsedDataValidator below.
            If validator fails, upload fails too, so any predictable issues with the data must be handled by your parser.
            Validator does not and should not apply any fixes.

            FUTURE: allow importing of sample info data through parser
        """
        # Mandatory
        self.df = pd.DataFrame(columns=['pos', 'data_type', 'col_index', 'row_index', 'raw_x', 'raw_y'])

        # TODO: Convert these dictionaries to types viable for visualisation. i.e. nest them
        # Example
        self.instrument_info = {'Instrument': 'qPCR', 'Filter': 'SYPRO Orange'}
        # Example
        self.warnings = {'Samples not found': ['A01', 'B04'], 'Poor quality samples': ['entire first row']}


class ExampleCsvParser(DummyParser):
    # This will read a single CSV file with well numbers as IDs

    parser_registration_settings = {
        'name': 'Example .csv parser',
        'info': 'This will read a single CSV file with positions taken from column names',
        'accepted_file_types': ['csv'],
        'available_data_types': ['fluorescence'],
        'allow_data_merge': False
    }

    def __init__(self, paths):
        self.warnings = ['Parsed without problems'] #{'Position not found': ['A02', 'B03'], 'Length discrepancy': ['A01']}
        self.data_type = 'fluorescence'
        self.file_df = pd.read_csv(paths[0])
        self.make_valid_pos()
        self.read_example_csv()

        self.instrument_info = ['Very old qPCR machine'] #{'Instrument': 'important instrument', 'Filter': 'SYPRO Orange'}

    def make_valid_pos(self):
        self.plate_rows = list(string.ascii_uppercase)
        self.plate_rows += [i+ii for i in list(string.ascii_uppercase) for ii in list(string.ascii_uppercase)]
        col_str_names_short = [str(i) for i in range(1, 100)]
        self.col_str_names_long = [str(i).rjust(2, '0') for i in range(1, 100)]
        self.short_pos_names = [i+ii for i in self.plate_rows for ii in col_str_names_short]
        self.normal_pos_names = [i+ii for i in self.plate_rows for ii in self.col_str_names_long]
        self.normal_pos_names_dict = {k: v for k, v in zip(self.short_pos_names, self.normal_pos_names)}
        self.valid_pos_names = self.short_pos_names + self.normal_pos_names


    def find_pos(self, name):
        pos = None
        for i in re.split(r'[ `\-=~!@#$%^&*()_+\[\]{};\'\\:"|<,./<>?]', name):
            if any(pos == i for pos in self.valid_pos_names):
                pos = i
                break
        if pos is None:
            return None
        else:
            # Short is bad! i.e. change 'A1' to 'A01'
            if pos in self.short_pos_names:
                pos = self.normal_pos_names_dict[pos]
        return pos

    def read_example_csv(self):
        # data is organised in pairs of x y coordinates
        df = self.file_df.copy()

        col_names = np.array_split(df.columns.tolist(), len(df.columns)/2)
        df_list = []
        for col_name_pair in list(col_names):
            pos = self.find_pos(','.join(col_name_pair))

            if pos is None:
                self.warnings.append(
                    'no valid sample position found in column names ({})'
                    .format(','.join(col_name_pair))
                )
                print('Data import warning: no valid sample position found in column names ({})'
                      .format(','.join(col_name_pair)))
                continue

            # Get well index
            col_index = self.col_str_names_long.index(pos[-2:])
            row_index = self.plate_rows.index(pos[:-2])

            raw_x = df[col_name_pair[0]].values
            raw_y = df[col_name_pair[1]].values

            if len(raw_y) != len(raw_x):
                self.warnings.append(
                    'x and y entries have different lengths in columns ({})'
                    .format(','.join(col_name_pair))
                )
                print('Data import warning: x and y entries have different lengths')
                continue

            df_list.append(pd.DataFrame.from_dict({
                'pos': pos,
                'data_type': self.data_type,
                'col_index': col_index,
                'row_index': row_index,
                'raw_x': [raw_x],
                'raw_y': [raw_y]
            }))

        self.df = pd.concat(df_list, ignore_index=True)


# TODO: This validator is not for data per se. Hence I should check if other attributes of the custom parser are valid?
# TODO: Check default settings dicts? But these will fail to be included in the database anyway
class ParserValidator:

    class DataFrame:
        def __init__(self, df):
            self.errors = []
            self.is_valid = True

            # Check if df is really a pandas dataframe
            if type(df) != pd.core.frame.DataFrame:
                self.errors.append(f'Object passed to dataframe validator is not pandas dataframe, it has type {str(type(df))}')
                self.is_valid = False
                # The remaining checks would fail, hence it stops checking here
                return

            # Check if all required columns are included
            required_cols = ['pos', 'data_type', 'col_index', 'row_index', 'raw_x', 'raw_y']
            if not set(required_cols).issubset(df.columns):
                self.errors.append(f'Dataframe does not have all of the required columns: {",".join(required_cols)}')
                self.is_valid = False
                # The remaining checks would fail, hence it stops checking here
                return

            # Check if there are any entries at all
            if len(df) < 1:
                self.errors.append(f'Dataframe passed to validator does not contain any entries')
                self.is_valid = False
                # The remaining checks would fail, hence it stops checking here
                return

            # Check uniqueness by pos and data_type
            unique_len = len(df.groupby(['pos', 'data_type']))
            if len(df) != unique_len:
                self.errors.append(f'Uniqueness of samples by position is ambiguous. Length of dataframe is {str(len(df))}, but {str(unique_len)} unique samples counted')
                self.is_valid = False

            # Check uniqueness by indexes and data_type
            unique_len = len(df.groupby(['col_index', 'row_index', 'data_type']))
            if len(df) != unique_len:
                self.errors.append(f'Uniqueness of samples by indexes is ambiguous. Length of dataframe is {str(len(df))}, but {str(unique_len)} unique samples counted')
                self.is_valid = False

            # Check if all entries per column have the same type and it is legit
            required_types = {'pos': [str], 'data_type': [str], 'col_index': [int], 'row_index': [int], 'raw_x': [list, np.ndarray], 'raw_y': [list, np.ndarray]}
            for col, _types in required_types.items():
                entries = df[col].to_list()
                types = set([type(i) for i in entries])
                if len(types) != 1:
                    self.errors.append(f'Column {col} contains entries with more than one type: {",".join([str(i) for i in list(types)])}')
                    self.is_valid = False
                else:
                    if list(types)[0] in [str(i) for i in _types]:
                        self.errors.append(f'Column {col} contains entries of {list(types)[0]}, but {" or ".join([str(i) for i in _types])} is expected')
                        self.is_valid = False
                        # TODO: Check whether values in list are floats or convertible as such

            # Check if x and y are same length in each sample
            for index, row in df.iterrows():
                if len(row['raw_x']) != len(row['raw_y']):
                    self.errors.append(f"Sample at position {row['pos']} contains raw_x and raw_y entries of different lengths:"
                                       f"raw_x is {len(row['raw_x'])} long and raw_y is {len(row['raw_y'])}")
                    self.is_valid = False

    class InstrumentInfo:
        def __init__(self, instrument_info):
            self.errors = []
            self.is_valid = True

            # Check if instrument_info really is a dict
            if type(instrument_info) != list:
                self.errors.append('Instrument info is not a list')
                self.is_valid = False
                return

            # # Check if keys and values are strings
            # for k, v in instrument_info.items():
            #     if type(k) != str:
            #         self.errors.append(f'Instrument info key {str(k)} is not a string')
            #         self.is_valid = False
            #     if type(v) != str:
            #         self.errors.append(f'Instrument info value {str(v)} in key {str(k)} is not a string')
            #         self.is_valid = False

    class Warnings:
        def __init__(self, warnings):
            self.errors = []
            self.is_valid = True

            # Check if warnings really is a dict
            if type(warnings) != list:
                self.errors.append('Parser warnings is not a list')
                self.is_valid = False
                return

            # # Check if keys and values are valid types
            # for k, v in warnings.items():
            #     if type(k) != str:
            #         self.errors.append(f'Parser warnings key {str(k)} is not a string')
            #         self.is_valid = False
            #     if type(v) != list:
            #         self.errors.append(f'Parser warnings value {str(v)} in key {str(k)} is not a list')
            #         self.is_valid = False
            #     else:
            #         # Check if entries within the list are all strings
            #         for i in v:
            #             if type(i) != str:
            #                 self.errors.append(f'Parser warnings value {str(v)} in key {str(k)} contains entry {str(i)} that is not string')
            #                 self.is_valid = False

    def __init__(self, parser_obj):
        self.errors = []
        self.is_valid = True

        if hasattr(parser_obj, 'df'):
            check_dataframe = self.DataFrame(parser_obj.df)
            self.errors.extend(check_dataframe.errors)
            if not check_dataframe.is_valid:
                self.is_valid = False
        else:
            self.errors = ["Parser object does not contain attribute 'df'"]
            self.is_valid = False
            return

        if hasattr(parser_obj, 'instrument_info'):
            check_instrument_info = self.InstrumentInfo(parser_obj.instrument_info)
            self.errors.extend(check_instrument_info.errors)
            if not check_instrument_info.is_valid:
                self.is_valid = False

        if hasattr(parser_obj, 'warnings'):
            check_warnings = self.Warnings(parser_obj.warnings)
            self.errors.extend(check_warnings.errors)
            if not check_warnings.is_valid:
                self.is_valid = False

        print('Is parsed data valid?', self.is_valid, f'\nThere are {str(len(self.errors))} error(s)\n', '\n'.join(self.errors))


class SampleInfoUploadParser:
    '''
        Parses uploaded the sample info sheet
        Number of columns gets truncated to the number of valid columns in the sample info sheet:
            9 basic columns + ('outlier' and 'blank')
            If present, parser attempts to convert 'outlier' and/or 'blank' to boolean types, but drops them if it fails
            If there are no headers altogether, 'outlier' and 'blank' cannot be imported

        Columns:
        ['pos', 'code', 'name', 'description', 'buffer', 'condition', 'concentration', 'unit', 'group', 'outlier', 'blank']

        This should always return a dataframe with all valid column names, renaming invalid named columns or populating with empty columns

    '''

    def __init__(self, path, column_names_present):
        valid_cols = ['pos', 'code', 'name', 'description', 'buffer', 'condition', 'concentration', 'unit', 'group', 'outlier', 'blank']

        if path.endswith('.xlsx') or path.endswith('.xls'):
            df = pd.read_excel(path, header=0 if column_names_present else None, engine='openpyxl')
        elif path.endswith('.csv'):
            df = pd.read_csv(path, header=0 if column_names_present else None)
        else:
            raise Exception('Unsupported file type! Can only parse .csv, .xlsx and .xls files')

        # If there are no headers, prepare the json
        if not column_names_present:
            # Limit the number of columns that will be imported. i.e. 9, since we don't know which ones could be bool
            if len(df.columns) > len(valid_cols)-2:
                df = df.drop(df.columns[len(valid_cols)-2:], axis=1)
                df.columns = valid_cols[:len(valid_cols)-2]
            else:
                df.columns = valid_cols[:len(df.columns)]

            df['outlier'], df['blank'] = False, False

            # Add any missing valid columns as empty fields
            for col in [i for i in valid_cols if i not in df.columns]:
                df[col] = np.nan

            # Finally, rearrange columns appropriately and convert to str
            df = df[valid_cols]
            for col in [i for i in valid_cols if i not in ['outlier', 'blank']]:
                df[col] = df[col].apply(str).replace({'nan': ''})

            # TODO: why am I converting and re-converting to json?
            self.json = json.loads(df.to_json(orient='records'))
            return

        # Normalise column names
        df.columns = [str(i).lower().replace(' ', '') for i in df.columns]

        # If present, convert 'outlier'' and/or 'blank' to boolean values
        for bool_col in ['outlier', 'blank']:
            if bool_col in df.columns:
                try:
                    df[bool_col] = self.ensure_bool(df[bool_col])
                except:
                    # Drop the column if conversion fails
                    df = df.drop(bool_col)
            else:
                # Add empty column otherwise
                df[bool_col] = False

        # Rename as many 'hanging' columns with invalid names as possible
        hanging_cols = [i for i in df.columns if i not in valid_cols]
        remaining_valid_cols = [i for i in valid_cols if i not in df.columns]
        df = df.rename(columns={
            hanging_cols[remaining_valid_cols.index(i)]: i for i in remaining_valid_cols[0:len(hanging_cols)]
        })

        # Add any missing valid columns as empty fields; bool columns are already added at this point.
        for col in [i for i in valid_cols if i not in df.columns]:
            df[col] = np.nan

        # Finally, rearrange columns appropriately and convert to str
        df = df[valid_cols]
        for col in [i for i in valid_cols if i not in ['outlier', 'blank']]:
            df[col] = df[col].apply(str).replace({'nan': ''})

        self.json = json.loads(df.to_json(orient='records'))

    def ensure_bool(self, series):
        # Although theoretically pandas takes care of this itself, just in case... ?
        mapping = {'false': 0, 'no': 0, 'true': 1, 'yes': 1, 'outlier': 1, 'blank': 1}
        series = series.map(mapping)
        series = series.fillna(0).astype('bool')
        return series





if __name__ == '__main__':
    # test_obj = ExampleCsvParser(['../../uploads/large_dataset.csv'])
    # test_obj = DummyParser(['../../uploads/large_dataset.csv'])
    # #print('Test output df:\n\n', test_obj.df)
    # #print('Has instrument_info:', hasattr(test_obj, 'instrument_info'))
    # ParserValidator(test_obj)

    test_sample_info_parser = SampleInfoUploadParser('../../uploads/small_sample_info.xlsx', True)



