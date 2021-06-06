import {Component, ElementRef, OnInit, ViewChild, AfterViewInit, Inject, PLATFORM_ID, NgZone} from '@angular/core';
import { FormControl } from '@angular/forms';
import {CommonService} from './common.service';

@Component({
  selector: 'app-tfanalysis',
  templateUrl: './tfanalysis.component.html',
  styleUrls: ['./tfanalysis.component.css']
})
export class TfanalysisComponent implements AfterViewInit {
  loading = false;
  uploading = false;
  selectedTab = new FormControl(1);

  experimentSelected: boolean;

  constructor(public commonService: CommonService) {
    commonService.dataImportSuccess$.subscribe(_ => {this.selectedTab.setValue(3); });

    commonService.transitionsProcessingStarted$.subscribe(_ => (this.loading = true));
    commonService.transitionsProcessed$.subscribe(_ => {
      this.selectedTab.setValue(5);
      this.loading = false;
    });

    commonService.peakFindingStarted$.subscribe(_ => (this.loading = true));
    commonService.peakFindingComplete$.subscribe(_ => (this.loading = false));

    commonService.experimentSelected$.subscribe(data => {
      this.experimentSelected = data !== null;
    });
  }

  ngAfterViewInit(): void {
  }

  onRawUploadProgress(status: any): void {
    this.uploading = status;
  }

  onRawUploadSuccess(status: any): void {
    this.selectedTab.setValue(3);
  }

  onTransitionProcessingSuccess(status: any): void {
    this.selectedTab.setValue(5);
  }

}
