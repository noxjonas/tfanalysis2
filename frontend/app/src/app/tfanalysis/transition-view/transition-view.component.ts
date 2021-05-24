import { Component, OnInit, ViewChild, Output } from '@angular/core';
import {TransitionViewService} from './transition-view.service';
import {CommonService} from '../common.service';
import { TransitionData } from '../common.service';
import {MatPaginator} from '@angular/material/paginator';
import {TransitionPlotComponent} from './transition-plot/transition-plot.component';
import {SampleInfo, SampleInfoComponent} from '../sample-info/sample-info.component';
import {FormControl, FormGroup, FormArray} from '@angular/forms';



@Component({
  selector: 'app-transition-view',
  templateUrl: './transition-view.component.html',
  styleUrls: ['./transition-view.component.css']
})
export class TransitionViewComponent implements OnInit {
  transitionData!: TransitionData[];
  plotDataType?: string;
  selected: any[] = [];
  filterPosArr: string[] = [];
  samples: SampleInfo[] = [];

  constructor(private transitionViewService: TransitionViewService,
              private commonService: CommonService,
              // private sampleInfoComponent: SampleInfoComponent
  ) {
    commonService.transitionsProcessed$.subscribe(data => this.ngOnInit());
    commonService.experimentSelected$.subscribe(experiment => this.ngOnInit());
    commonService.sampleInfoChanged$.subscribe(data => {
      this.samples = data;
    });
  }

  ngOnInit(): void {
    this.plotDataType = 'regular';
    if (this.commonService.selected) {
      this.importTransitionData();
      // this.makeFilters(this.commonService.sampleInfoData)
    }
  }

  sharePosFilter(data: any): void {
    this.filterPosArr = data;
  }

  importTransitionData(): void {
    this.transitionData = this.commonService.transitionData;
    console.log('delivered from common service', this.transitionData);
    // this.plot.transitionData = this.transitionData;
  }
  testCall(): void {
    console.log('selected data:', this.plotDataType);
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
