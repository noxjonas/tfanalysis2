import { Component, OnInit, AfterViewInit } from '@angular/core';
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
export class PeakFindingSettingsComponent implements OnInit {
  peakFindingSettings?: PeakFindingSettings;
  peakFindingSettingsForm?: any;

  peakModesAvailable: string[] = ['positive', 'negative', 'both'];

  constructor(private commonService: CommonService) {
    commonService.transitionsProcessed$.subscribe(experiment => this.ngOnInit());
  }

  ngOnInit(): void {
    this.importPeakFindingSettings();
  }

  importPeakFindingSettings(): void {
    this.commonService.fetchPeakFindingSettings()
      .subscribe(data => {
        console.log('this is the peak finding data', data);
        this.peakFindingSettings = data;

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
      });
  }

  resetSettings(): void {
    this.commonService.resetPeakFindingSettings().subscribe(data => {
      this.importPeakFindingSettings();
    })
  }


  callPeakFinding(): void {
    console.log('finding peaks...');
    // first update the settings
    this.commonService.updatePeakFindingSettings(this.peakFindingSettingsForm.getRawValue()).subscribe( data => {
      this.commonService.fetchPeakData();
    }, error => {
      console.log('Failed while uploading settings to the backend');
    });
  }

}
