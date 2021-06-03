import {Component, ElementRef, OnInit, ViewChild, AfterViewInit, Inject, PLATFORM_ID, NgZone} from '@angular/core';
import { FormControl } from '@angular/forms';
import {CommonService} from './common.service';
import {UplotGenService} from './transition-view/transition-plot/uplot-gen.service';

@Component({
  selector: 'app-tfanalysis',
  templateUrl: './tfanalysis.component.html',
  styleUrls: ['./tfanalysis.component.css']
})
export class TfanalysisComponent implements AfterViewInit {
  loading = false;
  uploading = false;
  selectedTab = new FormControl(1);

  constructor(private commonService: CommonService) {
    commonService.transitionsProcessingStarted$.subscribe(data => (this.loading = true));
    commonService.transitionsProcessed$.subscribe(data => {
      this.selectedTab.setValue(5);
      this.loading = false;
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
