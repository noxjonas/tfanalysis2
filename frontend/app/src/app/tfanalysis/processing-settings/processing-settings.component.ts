import { Component, OnInit } from '@angular/core';
import {ProcessingSettingsService} from "./processing-settings.service";
import {CommonService} from "../common.service";
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import {SampleInfoService} from "../sample-info/sample-info.service";


export interface ProcessingSettings {
  id: number;
  experiment_id: number;
  changed: string;
  selected_data_type: string;

  flat_blank: string; // position? or just 0.0 TODO: implement in settings
  blank_average: number;
  skip_outliers: boolean;

  truncate_x_min: number;
  truncate_x_max: number;

  interpolation_indices: number;
  interpolation_method: string; //default is 'linear'
  interpolation_order: number; //int

  peak_mode: string; // 'positive', 'negative', 'both'
  peak_derivative_of: string; // 'normalised', 'raw'
  peak_number_limit: number; //int

  peak_temp_limit_min: number; // see models TO DO in django
  peak_temp_limit_max: number; // see models TO DO in django
  peak_prominence_min: number;
  peak_prominence_max: number;
  peak_distance: number; // will need to convert this to int based on interpolation_indices
  peak_height_min: number;
  peak_height_max: number;
  peak_width_min: number; // not actually used
  peak_width_max: number; // not actually used
  peak_threshold_min: number; // not actually used
  peak_threshold_max: number; // not actually used

  smoothing_coefficient: number; // percent

  difference_significance: number;

  x_unit: string; // '°C'
  y_unit: string; // 'AU'
  x_label: string; // 't'
  y_label: string; // ''
}

interface GenericOptions {
  value: string;
}

@Component({
  selector: 'app-processing-settings',
  templateUrl: './processing-settings.component.html',
  styleUrls: ['./processing-settings.component.css']
})
export class ProcessingSettingsComponent implements OnInit {
  processingSettings?: ProcessingSettings;
  processingSettingsForm?: any;

  // This should be taken from api based on definitions available in raw data table for the experiment
  dataTypesAvailable: GenericOptions[] = [
    {value: 'fluorescence'},
  ]
  interpolationMethodsAvailable: GenericOptions[] = [
    {value: 'linear'}, {value: 'quadratic'}, {value: 'cubic'}, {value: 'spline'}, {value: 'polynomial'},
  ]
  peakModesAvailable: GenericOptions[] = [
    {value: 'positive'}, {value: 'negative'}, {value: 'both'},
  ]
  peakDerivativesOfAvailable: GenericOptions[] = [
    {value: 'normalised'}, {value: 'raw'}, {value: 'raw smoothened'},
  ]

  constructor(private processingSettingsService: ProcessingSettingsService,
              private commonService: CommonService) {
    commonService.experimentSelected$.subscribe(experiment => this.ngOnInit());
  }

  ngOnInit(): void {
    if (this.commonService.selected) {
      this.importProcessingSettings()
    }
  }

  importProcessingSettings() {
    this.processingSettingsService.fetchProcessingSettings()
      .subscribe(data => {
        this.processingSettings = data
        console.log(this.processingSettings)

        this.processingSettingsForm = new FormGroup({
          id: new FormControl(this.processingSettings?.id),
          selected_data_type: new FormControl(this.processingSettings?.selected_data_type),
          // flat_blank: new FormControl(this.processingSettings?.flat_blank), // how to implement this? is it needed?
          skip_outliers: new FormControl(this.processingSettings?.skip_outliers),

          truncate_x_min: new FormControl(this.processingSettings?.truncate_x_min),
          truncate_x_max: new FormControl(this.processingSettings?.truncate_x_max),

          interpolation_indices: new FormControl(this.processingSettings?.interpolation_indices),
          interpolation_method: new FormControl(this.processingSettings?.interpolation_method),
          interpolation_order: new FormControl(this.processingSettings?.interpolation_order),

          peak_mode: new FormControl(this.processingSettings?.peak_mode),
          peak_derivative_of: new FormControl(this.processingSettings?.peak_derivative_of),
          peak_number_limit: new FormControl(this.processingSettings?.peak_number_limit),

          peak_distance: new FormControl(this.processingSettings?.peak_distance),
          peak_prominence_min: new FormControl(this.processingSettings?.peak_prominence_min),
          peak_prominence_max: new FormControl(this.processingSettings?.peak_prominence_max),
          peak_height_min: new FormControl(this.processingSettings?.peak_height_min),
          peak_height_max: new FormControl(this.processingSettings?.peak_height_max),

          smoothing_coefficient: new FormControl(this.processingSettings?.smoothing_coefficient),

          difference_significance: new FormControl(this.processingSettings?.difference_significance),

          x_unit: new FormControl(this.processingSettings?.x_unit),
          y_unit: new FormControl(this.processingSettings?.y_unit),
          x_label: new FormControl(this.processingSettings?.x_label),
          y_label: new FormControl(this.processingSettings?.y_label),

        });
      });
  }

  onSubmit () {
    console.log('These are the updated settings', this.processingSettingsForm.value)
    this.processingSettingsService.updateProcessingSettings(this.processingSettingsForm.value).subscribe(
      data => {
        console.log('form data submitted')
      }
    )
    //TODO: write the service to update settings;
  }

  callDataProcessing () {
    // should call common service to process data
    this.commonService.fetchProcessedData()
  }
}
