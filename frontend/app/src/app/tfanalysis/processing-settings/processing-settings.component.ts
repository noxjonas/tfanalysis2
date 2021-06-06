import {Component, EventEmitter, OnInit, AfterViewInit} from '@angular/core';
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
export class ProcessingSettingsComponent implements OnInit {
  processingSettings?: TransitionProcessingSettings;
  processingSettingsForm?: any;

  // This should be taken from api based on definitions available in raw data table for the experiment
  dataTypesAvailable: string[] = [];

  interpolationMethodsAvailable: string[] = ['linear', 'quadratic', 'cubic', 'spline', 'polynomial'];
  dataToDeriveAvailable: string[] = ['normal', 'raw'];
  filterTypesAvailable: string[] = ['filtfilt', 'savgol'];

  sampleInfo: SampleInfo[] = [];
  filterPos: string[] = [];
  previewData: TransitionData[] = [];

  // Need to transfer axis labels to the transition view; use event emitter
  // public transitionProcessingSettingsChanged$: EventEmitter<TransitionProcessingSettings>;

  constructor(private commonService: CommonService) {
    commonService.experimentSelected$.subscribe(experiment => (experiment !== null ? this.importProcessingSettings() : null));
    // TODO: fetch sample info as soon as experiment is selected? this is probably what is preventing auto load on first run
    commonService.sampleInfoChanged$.subscribe(data => {
      this.sampleInfo = data;
    });
    // this.transitionProcessingSettingsChanged$ = new EventEmitter();

  }

  ngOnInit(): void {
  }

  importProcessingSettings(): void {
    this.commonService.fetchTransitionProcessingSettings()
      .subscribe(data => {
        this.processingSettings = data;
        this.dataTypesAvailable = data.data_types_available;

        this.processingSettingsForm = new FormGroup({
          id: new FormControl(this.processingSettings?.id),
          experiment: new FormControl(this.processingSettings?.experiment),
          default_settings: new FormControl(this.processingSettings?.default_settings),
          updated: new FormControl(this.processingSettings?.updated),

          data_types_available: new FormControl(this.processingSettings?.data_types_available),
          selected_data_type: new FormControl(this.processingSettings?.selected_data_type),

          truncate_x_min: new FormControl(this.processingSettings?.truncate_x_min),
          truncate_x_max: new FormControl(this.processingSettings?.truncate_x_max),

          interpolation_indices: new FormControl(this.processingSettings?.interpolation_indices),
          interpolation_method: new FormControl(this.processingSettings?.interpolation_method),
          interpolation_order: new FormControl(this.processingSettings?.interpolation_order),

          filter_type: new FormControl(this.processingSettings?.filter_type),
          savgol_smoothing_coefficient: new FormControl(this.processingSettings?.savgol_smoothing_coefficient),
          filtfilt_n: new FormControl(this.processingSettings?.filtfilt_n),
          filtfilt_wn: new FormControl(this.processingSettings?.filtfilt_wn),

          data_to_derive: new FormControl(this.processingSettings?.data_to_derive),
          derivative_period: new FormControl(this.processingSettings?.derivative_period),

          x_unit: new FormControl(this.processingSettings?.x_unit),
          y_unit: new FormControl(this.processingSettings?.y_unit),
          x_label: new FormControl(this.processingSettings?.x_label),
          y_label: new FormControl(this.processingSettings?.y_label),

        });
        // TODO: take care with this
        this.callDataProcessing();
      });
  }

  resetSettings(): void {
    this.commonService.resetTransitionProcessingSettings().subscribe( data => {
      this.importProcessingSettings();
    });
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

    // first update the settings and process selected samples
    this.commonService.updateTransitionProcessingSettings(this.processingSettingsForm.getRawValue()).subscribe( settings => {
      this.processingSettings = settings;
      // this.transitionProcessingSettingsChanged$.emit(settings);
      this.commonService.transitionProcessingSettings = settings;
      this.commonService.postPreviewTransitionProcessing(this.filterPos).subscribe(data => {
        this.previewData = data;
      });
    });
  }

  callDataProcessing(): void {
    // first update the settings
    this.commonService.updateTransitionProcessingSettings(this.processingSettingsForm.getRawValue()).subscribe( settings => {
      this.processingSettings = settings;
      // this.transitionProcessingSettingsChanged$.emit(settings);
      this.commonService.transitionProcessingSettings = settings;
      this.commonService.fetchProcessedTransitionData();
    }, error => {
      console.log('Failed while uploading settings to the backend', this.commonService.selected);
    });
  }

}
