import {Component, OnInit, Input, OnChanges, SimpleChanges, NgZone, AfterViewInit, Inject, PLATFORM_ID, ViewChild, ElementRef} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {
  ChartDataSets,
  ChartType,
  ChartOptions,
  Scriptable,
  PointStyle,
  ChartColor,
  PositionType,
  ChartLegendLabelItem, ChartLegendLabelOptions
} from 'chart.js';
import { Label } from 'ng2-charts';
import {CommonService, TransitionData} from '../../common.service';
import {SampleInfo} from '../../sample-info/sample-info.component';

// import * as uPlot from 'uplot'

// import {Series} from "./uPlot";

// import * as uPlot from "./uPlot"

// import * as uPlot from 'uplot'


// amCharts imports
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import {options} from '@amcharts/amcharts4/core';

// import uPlot, { Series, Options } from 'uplot';

import {UplotGenService} from './uplot-gen.service';

// @ts-ignore
import uPlot from 'uplot';
// declare const uPlot: any;
import {Options} from 'uplot';
// import Options from "../../../../../node_modules/uplot/dist/uPlot"

// @ts-ignore
// import uPlot from 'uPlot';


// https://github.com/plotly/angular-plotly.js/blob/master/README.md

// TODO: For speed consider simplifiedProcessing attribute of series

interface RegularTransitionSeriesData {
  // scatter_raw_x: number,
  // scatter_raw_y: number,
  scatter_regular_x: number;
  scatter_regular_y: number;
  scatter_normal_y: number;
  scatter_smooth_y: number;
  scatter_first_der_y: number;
}

interface RegularGenericTransitionData {
  x: number;
  y: number;
}

// tslint:disable-next-line:class-name
interface xy {
  x: number;
  y: number;
}

class SeriesData {
  constructor(
    data: {
      x: number;
      y: number;
    }[],
    label: string,
  ) {}
}

class DefaultColours {
  grey = ['#7f7f7f', '#a8a8a8', '#535353', '#939393', '#696969'];
  blue = ['#1f77b4', '#7ba2cd', '#204e74', '#568cc1', '#216293'];
  orange = ['#ff7f0e', '#ffaf71', '#a45415', '#ff9848', '#d06913'];
  green = ['#2ca02c', '#7ec073', '#256822', '#5ab051', '#298427'];
  red = ['#d62728', '#ef7b6a', '#8b221d', '#e45648', '#b02623'];
  purple = ['#9467bd', '#b998d3', '#61457a', '#a77fc8', '#7a569b'];
  brown = ['#8c564b', '#b48b83', '#5c3a33', '#a07066', '#74483f'];
  pink = ['#e377c2', '#efa6d6', '#e98fcc', '#914f7d', '#b9639f'];
  yellow = ['#bcbd22', '#d7d275', '#7a7a1f', '#cac850', '#9a9b21'];
  teal = ['#17becf', '#84d4df', '#227a85', '#5dc9d7', '#209ca9'];
}
interface GenericColours {
  [index: string]: any;
}

interface SeriesColours {
  pos: string;
  color: string;
  [index: string]: string;
}

interface PlotlyDataObject {
  x: number[];
  y: number[];
  type: string; // 'line', 'scatter' etc.
  mode: string; // ?
  marker: {
    color: string;
  };
}


@Component({
  selector: 'app-transition-plot',
  templateUrl: './transition-plot.component.html',
  styleUrls: ['./transition-plot.component.css']
})
export class TransitionPlotComponent implements AfterViewInit, OnChanges {
  @Input() transitionData!: TransitionData[];
  @Input() plotDataType!: string;
  @Input() filterPosArr!: string[];
  @Input() samples: SampleInfo[] = [];

  @ViewChild('chartElement') chartElement: ElementRef<HTMLElement>;

  revision = 0;


  defaultColours = {
    // Arrays defining each base colour must have identical lengths
    grey : ['#7f7f7f', '#a8a8a8', '#535353', '#939393', '#696969'],
    blue : ['#1f77b4', '#7ba2cd', '#204e74', '#568cc1', '#216293'],
    orange : ['#ff7f0e', '#ffaf71', '#a45415', '#ff9848', '#d06913'],
    green : ['#2ca02c', '#7ec073', '#256822', '#5ab051', '#298427'],
    red : ['#d62728', '#ef7b6a', '#8b221d', '#e45648', '#b02623'],
    purple : ['#9467bd', '#b998d3', '#61457a', '#a77fc8', '#7a569b'],
    brown : ['#8c564b', '#b48b83', '#5c3a33', '#a07066', '#74483f'],
    pink : ['#e377c2', '#efa6d6', '#e98fcc', '#914f7d', '#b9639f'],
    yellow : ['#bcbd22', '#d7d275', '#7a7a1f', '#cac850', '#9a9b21'],
    teal : ['#17becf', '#84d4df', '#227a85', '#5dc9d7', '#209ca9'],
  } as GenericColours;
  seriesColours: SeriesColours[] = [];

  public graph = {
    data: [{
      x: [1, 2],
      y: [1, 2],
      type: 'scatter',
      mode: 'lines',
      visible: false,
      marker: {
        color: 'red'
      },
      meta: 'loading'
    }],
    layout: {width: 800, height: 500, title: 'Transition plots'}
  };

  constructor(@Inject(PLATFORM_ID) private platformId: any, private zone: NgZone,
              private commonService: CommonService,
              private chartBuilder: UplotGenService) {
    commonService.experimentSelected$.subscribe(data => this.clearChart());
  }
  // Run the function only in the browser
  browserOnly(f: () => void): void {
    if (isPlatformBrowser(this.platformId)) {
      this.zone.runOutsideAngular(() => {
        f();
      });
    }
  }
  ngAfterViewInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('These are the changes that are happening:', changes);
    // Ignore first changes
    // if (this.revision < 1) {
    //   return;
    // }
    // Separate into functions that do different things dependent on change
    if (changes.plotDataType) {
      console.log('property', changes.plotDataType.currentValue);
      this.changeChartData(changes.plotDataType.currentValue);
      // this.changeDataFields()
      // update plot data
      // this.generateColors();
      // this.applyData();
    }
    if (changes.filterPosArr) {
      // react to changes in filters
      this.filterChartLegend(changes.filterPosArr.currentValue);
    }
    if (changes.transitionData) {
      setTimeout(() =>
        {
          this.makeChart();
        },
        1);

      // apply changes when the data changes
      // i.e. remake the chart and colouring

    }
  }

  // TODO: add selection whether to show raw data

  makeChart(): void {
    console.log('this is the data I deal with', this.transitionData);
    const newData: any[] = [];
    this.transitionData.forEach(sample => {
      newData.push({
        x: sample.regular_x,
        y: sample.regular_y,
        name: sample.pos,
        type: 'scatter',
        mode: 'lines',
        marker: {
          color: 'red'
        },
        meta: sample.pos,
      });
      }
    );
    // this.graph.data = newData;
    this.graph = {
      data: newData,
      layout: {width: 800, height: 500, title: 'Transition plots'}
    };
    this.filterChartLegend(this.filterPosArr);
    this.applyColors();
    //this.revision = 0;

  }

  clearChart(): void {
    this.graph.data = [{
      x: [1, 2],
      y: [1, 2],
      type: 'scatter',
      mode: 'lines',
      visible: false,
      marker: {
        color: 'red'
      },
      meta: 'loading'
    }];
    this.revision += 1;
  }

  changeChartData(dataType: string): void {
    this.graph.data.forEach((data, index) => {
      // tslint:disable-next-line:no-string-literal
      data.y = this.transitionData[index][dataType + '_y'];
    });
    this.revision += 1;
  }

  filterChartLegend(displayedSamples: string[]): void {
    const visibility = (pos: string, displayed: string[]) => {
      return displayed.includes(pos);
    };

    this.graph.data.forEach((data, index) => {
      // tslint:disable-next-line:no-string-literal
      data.visible = displayedSamples.includes(data.meta);
    });
    this.revision += 1;
  }

  applyColors(): void {
    // Should colours be recalculated based on visible filters?
    // Probably yes, otherwise you can easily end up with very few distinct colours
    // Also, filtered samples will not be displayed, so I don't even have to change their colours
    // Remember to assign, white or any colour to the filtered out samples as this must have the same dimensions

    // Get displayed samples
    // @ts-ignore
    const displayedSamples: SampleInfo[] = this.samples.flatMap(x => this.filterPosArr.includes(x.pos) ? x : []);
    const displayedSamplesPos = displayedSamples.map(x => x.pos);

    // Check if grouping is used; i.e. there must be more than 1 group
    const groups = [...new Set(displayedSamples.map(x => x.group))].sort();
    // console.log('groups', groups);
    if (groups.length < 2) {
      // just make simple array of colours
      const simpleColourArr = [];
      for (let i = 0; i < this.defaultColours[Object.keys(this.defaultColours)[0]].length; i++) {
        for (const prop in this.defaultColours) {
          if (Object.prototype.hasOwnProperty.call(this.defaultColours, prop)) {
            simpleColourArr.push(this.defaultColours[prop][i]);
          }
        }
      }
      // multiply this array to make sure there are enough colours to cover all samples
      const extendedColourArr: string[] = [];
      for (let i = 0; i <= Math.ceil( this.samples.length / simpleColourArr.length ); i++) {
        extendedColourArr.push(...simpleColourArr);
      }

      let offset = 0;
      this.seriesColours = this.samples.map((x, i) => {
        if (displayedSamplesPos.includes(x.pos)) {
          return {pos: x.pos, color: extendedColourArr[i + offset]};
        } else {
          offset += 1;
          return {pos: x.pos, color: '#ffffff'};
        }
      });

    } else {
      // TODO: implement colouring by group
      console.log('There are groups', groups);
    }

    this.graph.data.forEach((data, index) => {
      // tslint:disable-next-line:no-string-literal
      data.marker.color = this.seriesColours.find(i => i.pos === data.meta).color;
    });
    this.revision += 1;

    // an array should be returned in same order and length as sample info, since pos will be used to map colour
    //  to both scatter points and the v-lines
  }

}
