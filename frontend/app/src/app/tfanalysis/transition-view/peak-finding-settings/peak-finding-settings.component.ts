import {Component, OnInit, AfterViewInit, OnChanges, SimpleChanges, Input} from '@angular/core';
import {TransitionProcessingSettings} from '../../processing-settings/processing-settings.component';
import {CommonService} from '../../common.service';
import {FormControl, FormGroup} from '@angular/forms';

export interface PeakFindingSettings {
  id: number;
  experiment: number;
  default_settings: number;
  updated: string;

  limit_x_min: number;
  limit_x_max: number;

  peak_mode: string; // positive, negative, both

  number_limit: number;

  prominence_min: number;
  prominence_max: number;
  distance: number;
  height_min: number;
  height_max: number;
  width_min: number;
  width_max: number;
  threshold_min: number;
  threshold_max: number;
}


@Component({
  selector: 'app-peak-finding-settings',
  templateUrl: './peak-finding-settings.component.html',
  styleUrls: ['./peak-finding-settings.component.css']
})
export class PeakFindingSettingsComponent implements OnInit, OnChanges {
  @Input() peakFindingSettings?: PeakFindingSettings;

  peakFindingSettingsForm?: FormGroup;

  peakModesAvailable: string[] = ['positive', 'negative', 'both'];

  constructor(private commonService: CommonService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.peakFindingSettings && this.peakFindingSettings) {
      this.peakFindingSettingsForm = new FormGroup({
        id: new FormControl(this.peakFindingSettings?.id),
        experiment: new FormControl(this.peakFindingSettings?.experiment),
        default_settings: new FormControl(this.peakFindingSettings?.default_settings),
        updated: new FormControl(this.peakFindingSettings?.updated),

        limit_x_min: new FormControl(this.peakFindingSettings?.limit_x_min),
        limit_x_max: new FormControl(this.peakFindingSettings?.limit_x_max),

        peak_mode: new FormControl(this.peakFindingSettings?.peak_mode),

        number_limit: new FormControl(this.peakFindingSettings?.number_limit),

        prominence_min: new FormControl(this.peakFindingSettings?.prominence_min),
        prominence_max: new FormControl(this.peakFindingSettings?.prominence_max),
        distance: new FormControl(this.peakFindingSettings?.distance),
        height_min: new FormControl(this.peakFindingSettings?.height_min),
        height_max: new FormControl(this.peakFindingSettings?.height_max),
        width_min: new FormControl(this.peakFindingSettings?.width_min),
        width_max: new FormControl(this.peakFindingSettings?.width_max),
        threshold_min: new FormControl(this.peakFindingSettings?.threshold_min),
        threshold_max: new FormControl(this.peakFindingSettings?.threshold_max),
      });
      this.commonService.peakFindingSettingsForm = this.peakFindingSettingsForm;
      this.peakFindingSettingsForm.valueChanges.subscribe(_ => {
        this.commonService.peakFindingSettingsForm = this.peakFindingSettingsForm;
      });
    }
  }

  resetSettings(): void {
    this.commonService.resetPeakFindingSettings();
  }

  callPeakFinding(): void {
    this.commonService.fetchPeakData();
  }

}
