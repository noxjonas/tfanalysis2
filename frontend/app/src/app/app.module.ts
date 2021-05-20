import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TfanalysisComponent } from './tfanalysis/tfanalysis.component';
import { MaterialModule } from './material/material.module';
import { FileUploadComponent } from './tfanalysis/file-upload/file-upload.component';

import { FileUploadService } from './tfanalysis/file-upload/file-upload.service';

import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { FilePickerModule } from  'ngx-awesome-uploader';
import { SelectExperimentComponent } from './tfanalysis/select-experiment/select-experiment.component';
import {SelectExperimentService} from "./tfanalysis/select-experiment/select-experiment.service";
import {MatTableModule} from "@angular/material/table";
import {CommonService} from "./tfanalysis/common.service";
import { SampleInfoComponent } from './tfanalysis/sample-info/sample-info.component';
import { HotTableModule } from '@handsontable/angular';
import {FormsModule} from "@angular/forms";
import { ProcessingSettingsComponent } from './tfanalysis/processing-settings/processing-settings.component';
import { TransitionViewComponent } from './tfanalysis/transition-view/transition-view.component';
import { TransitionPlotComponent } from './tfanalysis/transition-view/transition-plot/transition-plot.component';
import {NgxEchartsModule} from "ngx-echarts";
import { ChartsModule } from 'ng2-charts';
import { DragToSelectModule } from 'ngx-drag-to-select';
import { TransitionFilterComponent } from './tfanalysis/transition-view/transition-filter/transition-filter.component';
import {UplotGenService} from "./tfanalysis/transition-view/transition-plot/uplot-gen.service";


@NgModule({
  declarations: [
    AppComponent,
    TfanalysisComponent,
    FileUploadComponent,
    SelectExperimentComponent,
    SampleInfoComponent,
    ProcessingSettingsComponent,
    TransitionViewComponent,
    TransitionPlotComponent,
    TransitionFilterComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialModule,
    HttpClientModule,
    ReactiveFormsModule,
    FilePickerModule,
    MatTableModule,
    HotTableModule,
    FormsModule,
    ChartsModule,
    DragToSelectModule.forRoot(),
  ],
  providers: [
    FileUploadService,
    SelectExperimentService,
    CommonService,
    UplotGenService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
