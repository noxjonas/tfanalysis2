import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TfanalysisComponent } from './tfanalysis/tfanalysis.component';
import { MaterialModule } from './material/material.module';
import { FileUploadComponent } from './tfanalysis/file-upload/file-upload.component';

import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { FilePickerModule } from 'ngx-awesome-uploader';
import { SelectExperimentComponent } from './tfanalysis/select-experiment/select-experiment.component';
import {MatTableModule} from '@angular/material/table';
import {CommonService} from './tfanalysis/common.service';
import { SampleInfoComponent } from './tfanalysis/sample-info/sample-info.component';
import { HotTableModule } from '@handsontable/angular';
import {FormsModule} from '@angular/forms';
import { ProcessingSettingsComponent } from './tfanalysis/processing-settings/processing-settings.component';
import { TransitionViewComponent } from './tfanalysis/transition-view/transition-view.component';
import { TransitionPlotComponent } from './tfanalysis/transition-view/transition-plot/transition-plot.component';
// import {NgxEchartsModule} from "ngx-echarts";
import { ChartsModule } from 'ng2-charts';
import { DragToSelectModule } from 'ngx-drag-to-select';
import { TransitionFilterComponent } from './tfanalysis/transition-view/transition-filter/transition-filter.component';
// import {UplotGenService} from "./tfanalysis/transition-view/transition-plot/uplot-gen.service";

import * as PlotlyJS from 'plotly.js-dist';
import { PlotlyModule } from 'angular-plotly.js';
import { FileUploadDirective } from './tfanalysis/file-upload/file-upload.directive';
import { DeleteConfirmDialogComponent } from './tfanalysis/select-experiment/delete-confirm-dialog.component';
import { DataPreviewComponent } from './tfanalysis/processing-settings/data-preview/data-preview.component';
import { SampleSelectorComponent } from './tfanalysis/processing-settings/sample-selector/sample-selector.component';
import { PeakFindingSettingsComponent } from './tfanalysis/transition-view/peak-finding-settings/peak-finding-settings.component';
import { StandardErrorDialogComponent } from './tfanalysis/error-dialogs/standard-error-dialog/standard-error-dialog.component';

PlotlyModule.plotlyjs = PlotlyJS;

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
    FileUploadDirective,
    DeleteConfirmDialogComponent,
    DataPreviewComponent,
    SampleSelectorComponent,
    PeakFindingSettingsComponent,
    StandardErrorDialogComponent,
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
    PlotlyModule
  ],
  providers: [
    CommonService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
