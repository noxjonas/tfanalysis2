import {Component, EventEmitter, OnInit, AfterViewInit, Input, OnChanges, SimpleChanges} from '@angular/core';
import { CommonService, TransitionData } from '../common.service';
import { FormGroup, FormControl } from '@angular/forms';
import { SampleInfo } from '../sample-info/sample-info.component';


export interface TransitionProcessingSettings {
  id: number;
  experiment: number;
  default_settings: number;
  updated: string;

  data_types_available: string[];
  selected_data_type: string;

  truncate_x_min: number;
  truncate_x_max: number;

  interpolation_indices: number;
  interpolation_method: string;
  interpolation_order: number;

  filter_type: string;
  savgol_smoothing_coefficient: number;
  filtfilt_n: number;
  filtfilt_wn: number;

  data_to_derive: string;
  derivative_period: number;

  x_unit: string;
  y_unit: string;
  x_label: string;
  y_label: string;
}

@Component({
  selector: 'app-processing-settings',
  templateUrl: './processing-settings.component.html',
  styleUrls: ['./processing-settings.component.css']
})
export class ProcessingSettingsComponent implements OnInit, OnChanges {
  @Input() sampleInfo: SampleInfo[];
  @Input() transitionProcessingSettings: TransitionProcessingSettings;

  processingSettings: TransitionProcessingSettings;

  processingSettingsForm: FormGroup;

  // This should be taken from api based on definitions available in raw data table for the experiment
  dataTypesAvailable: string[] = [];

  interpolationMethodsAvailable: string[] = ['linear', 'quadratic', 'cubic', 'spline', 'polynomial'];
  dataToDeriveAvailable: string[] = ['normal', 'raw'];
  filterTypesAvailable: string[] = ['filtfilt', 'savgol'];

  // sampleInfo: SampleInfo[] = [];
  filterPos: string[] = [];
  previewData: TransitionData[] = [];

  constructor(public commonService: CommonService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.transitionProcessingSettings && this.transitionProcessingSettings) {
      this.dataTypesAvailable = this.transitionProcessingSettings.data_types_available;

      this.processingSettingsForm = new FormGroup({
        id: new FormControl(this.transitionProcessingSettings?.id),
        experiment: new FormControl(this.transitionProcessingSettings?.experiment),
        default_settings: new FormControl(this.transitionProcessingSettings?.default_settings),
        updated: new FormControl(this.transitionProcessingSettings?.updated),

        data_types_available: new FormControl(this.transitionProcessingSettings?.data_types_available),
        selected_data_type: new FormControl(this.transitionProcessingSettings?.selected_data_type),

        truncate_x_min: new FormControl(this.transitionProcessingSettings?.truncate_x_min),
        truncate_x_max: new FormControl(this.transitionProcessingSettings?.truncate_x_max),

        interpolation_indices: new FormControl(this.transitionProcessingSettings?.interpolation_indices),
        interpolation_method: new FormControl(this.transitionProcessingSettings?.interpolation_method),
        interpolation_order: new FormControl(this.transitionProcessingSettings?.interpolation_order),

        filter_type: new FormControl(this.transitionProcessingSettings?.filter_type),
        savgol_smoothing_coefficient: new FormControl(this.transitionProcessingSettings?.savgol_smoothing_coefficient),
        filtfilt_n: new FormControl(this.transitionProcessingSettings?.filtfilt_n),
        filtfilt_wn: new FormControl(this.transitionProcessingSettings?.filtfilt_wn),

        data_to_derive: new FormControl(this.transitionProcessingSettings?.data_to_derive),
        derivative_period: new FormControl(this.transitionProcessingSettings?.derivative_period),

        x_unit: new FormControl(this.transitionProcessingSettings?.x_unit),
        y_unit: new FormControl(this.transitionProcessingSettings?.y_unit),
        x_label: new FormControl(this.transitionProcessingSettings?.x_label),
        y_label: new FormControl(this.transitionProcessingSettings?.y_label),
      });
      this.commonService.transitionProcessingSettingsForm = this.processingSettingsForm;
      this.processingSettingsForm.valueChanges.subscribe(data => {
        this.commonService.transitionProcessingSettingsForm = this.processingSettingsForm;
      });
    }
  }

  resetSettings(): void {
    this.commonService.resetTransitionProcessingSettings();
  }

  updatePreviewFilter(event: any): void {
    this.filterPos = event;
    // and immediately process the data
    this.previewTransitionProcessing();
  }

  previewTransitionProcessing(): void {
    // Do nothing if no samples selected
    if (this.filterPos.length < 1) {
      return;
    }
    this.commonService.postPreviewTransitionProcessing(this.filterPos);
  }

  callDataProcessing(): void {
    this.commonService.fetchProcessedTransitionData();
  }

}
