import {Component, OnInit, ViewChild, Output, ElementRef, Input, OnChanges, SimpleChanges} from '@angular/core';
import {TransitionViewService} from './transition-view.service';
import {CommonService, PeakData} from '../common.service';
import { TransitionData } from '../common.service';
import {TransitionPlotComponent} from './transition-plot/transition-plot.component';
import {SampleInfo, SampleInfoComponent} from '../sample-info/sample-info.component';
import {FormControl, FormGroup, FormArray} from '@angular/forms';
import {ProcessingSettingsComponent, TransitionProcessingSettings} from '../processing-settings/processing-settings.component';



@Component({
  selector: 'app-transition-view',
  templateUrl: './transition-view.component.html',
  styleUrls: ['./transition-view.component.css']
})
export class TransitionViewComponent implements OnInit, OnChanges {
  @Input() sampleInfo: SampleInfo[];
  @Input() transitionProcessingSettings: TransitionProcessingSettings;
  @Input() transitionData!: TransitionData[];
  @Input() peakData: PeakData[];

  plotDataType?: string;

  selected: any[] = [];
  filterPosArr: string[] = [];

  // TODO: rename
  // peakData: PeakData[];


  @ViewChild('transitionPlot', {static: false}) transitionPlot: any;

  constructor(// private transitionViewService: TransitionViewService,
              public commonService: CommonService,
              // private processingSettingsComponent: ProcessingSettingsComponent,
              // private sampleInfoComponent: SampleInfoComponent
  ) {
    // commonService.transitionsProcessed$.subscribe(data => this.ngOnInit());
    // commonService.experimentSelected$.subscribe(experiment => this.ngOnInit());
    // commonService.sampleInfoChanged$.subscribe(data => {
    //   this.sampleInfo = data;
    // });
    // commonService.peakFindingComplete$.subscribe(data => {
    //   this.peaks = this.commonService.peakData;
    // });
    // processingSettingsComponent.transitionProcessingSettingsChanged$.subscribe(settings =>{
    //   this.transitionProcessingSettings = settings;
    // });
  }

  ngOnInit(): void {
    // this.plotDataType = 'regular';
    // this.importData();
    // if (this.commonService.selected) {
    //   this.importData();
    //   // this.makeFilters(this.commonService.sampleInfoData)
    // }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes.transitionData) {
    //
    // }
  }

  sharePosFilter(data: any): void {
    this.filterPosArr = data;
  }

  importData(): void {
    this.transitionData = this.commonService.transitionData;
    this.transitionProcessingSettings = this.commonService.transitionProcessingSettings;
    console.log('delivered from common service', this.transitionData);
    // this.plot.transitionData = this.transitionData;
  }

  recolourPlot(): void {
    this.transitionPlot.applyColors();
  }

}


// this.transitionData.forEach(function(series) {
//   let x = series[selectedX]
//   let y = series[selectedY]
//   const zip = (a: number[], b: number[]) => a.map((k: number, i: number) => <xy>{x: k, y: b[i]});
//   data.push(<SeriesData>{
//     data: zip(x, y),
//     label: series.pos,
//     pointRadius: 7,
//     fill: true,
//     borderColor: 'rgb(150, 0, 0)',
//     backgroundColor: 'rgb(150, 0, 0)',
//     borderWidth: 1,
//     pointStyle: 'rectRot',
//     pointBorderColor: 'rgb(150, 0, 0)',
//     pointBackgroundColor: 'rgb(150, 0, 0)'
//   })
// })
// this.scatterChartData = data
