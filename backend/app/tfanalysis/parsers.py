from .models import RawData
import pandas as pd
import numpy as np
import string
import re
#python parsers.py

class InvalidSamplePosition(Exception):
    pass

class ExampleParser:
    # This will read a single CSV file with well numbers as IDs
    # Deposits contents to raw data table
    def __init__(self, paths):
        self.errors = []
        self.data_type = 'fluorescence'
        self.file_df = pd.read_csv(paths[0])
        self.make_valid_pos()
        self.read_example_csv()

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
                self.errors.append(
                    'Data import error: no valid sample position found in column names ({})'
                    .format(','.join(col_name_pair))
                )
                print('Data import error: no valid sample position found in column names ({})')
                continue

            # Get well index
            col_index = self.col_str_names_long.index(pos[-2:])
            row_index = self.plate_rows.index(pos[:-2])

            raw_x = df[col_name_pair[0]].values
            raw_y = df[col_name_pair[1]].values

            if len(raw_y) != len(raw_x):
                self.errors.append(
                    'Data import error: x and y entries have different lengths in columns ({})'
                    .format(','.join(col_name_pair))
                )
                print('Data import error: x and y entries have different lengths')
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


if __name__ == '__main__':
    test_obj = ExampleParser(['../../uploads/large_dataset_wTnhyw6.csv'])