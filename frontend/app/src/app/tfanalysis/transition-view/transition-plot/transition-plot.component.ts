import {Component, OnInit, Input, OnChanges, SimpleChanges, NgZone, AfterViewInit,Inject, PLATFORM_ID, ViewChild, ElementRef} from '@angular/core';
import {isPlatformBrowser} from "@angular/common";
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
import {CommonService, TransitionData} from "../../common.service";
import {SampleInfo} from "../../sample-info/sample-info.component";

//import * as uPlot from 'uplot'

//import {Series} from "./uPlot";

//import * as uPlot from "./uPlot"

//import * as uPlot from 'uplot'


// amCharts imports
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import {options} from "@amcharts/amcharts4/core";

//import uPlot, { Series, Options } from 'uplot';

import {UplotGenService} from "./uplot-gen.service";

// @ts-ignore
import uPlot from 'uplot';
//declare const uPlot: any;
import {Options} from "uplot";
//import Options from "../../../../../node_modules/uplot/dist/uPlot"

// @ts-ignore
//import uPlot from 'uPlot';

//TODO: For speed consider simplifiedProcessing attribute of series

interface RegularTransitionSeriesData {
  // scatter_raw_x: number,
  // scatter_raw_y: number,
  scatter_regular_x: number,
  scatter_regular_y: number,
  scatter_normal_y: number,
  scatter_smooth_y: number,
  scatter_first_der_y: number,
}

interface RegularGenericTransitionData {
  x: number,
  y: number,
}

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
  pos: string,
  color: string,
  [index: string]: string;
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


  defaultColours = <GenericColours>{
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
  }
  seriesColours: SeriesColours[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: any, private zone: NgZone,
    private commonService: CommonService,
              private chartBuilder: UplotGenService) {
    commonService.transitionsProcessed$.subscribe(data => this.ngAfterViewInit())
  }
  // Run the function only in the browser
  browserOnly(f: () => void) {
    if (isPlatformBrowser(this.platformId)) {
      this.zone.runOutsideAngular(() => {
        f();
      });
    }
  }
  ngAfterViewInit() {

    function round2(val:any) {
      return Math.round(val * 100) / 100;
    }

    function round3(val:any) {
      return Math.round(val * 1000) / 1000;
    }

    function prepData(packed:any) {
      console.time("prep");

      // epoch,idl,recv,send,read,writ,used,free

      const numFields = packed[0];

      packed = packed.slice(numFields + 1);

      // 55,550 data points x 3 series = 166,650
      let data = [
        Array(packed.length/numFields),
        Array(packed.length/numFields),
        Array(packed.length/numFields),
        Array(packed.length/numFields),
      ];

      for (let i = 0, j = 0; i < packed.length; i += numFields, j++) {
        data[0][j] = packed[i] * 60;	// * 1e3
        data[1][j] = round3(100 - packed[i+1]);
        data[2][j] = round2(100 * packed[i+5] / (packed[i+5] + packed[i+6]));
        data[3][j] = packed[i+3];
      }

      /*
        function filter(d) {
          return d.filter((d, i) => Math.round(i/1000) % 5 != 2);
        }
        data[0] = filter(data[0]);
        data[1] = filter(data[1]);
        data[2] = filter(data[2]);
        data[3] = filter(data[3]);
      */
      /*
        data[0] = data[0].slice(0, 1000);
        data[1] = data[1].slice(0, 1000);
        data[2] = data[2].slice(0, 1000);
        data[3] = data[3].slice(0, 1000);
        data[1][35] = null;
        data[1][36] = null;
        data[2][730] = null;
      */
      console.timeEnd("prep");

      return data;
    }

    function makeChart(data:any) {
      console.time("chart");

      const opts = {
        title: "Server Events",
        width: 1920,
        height: 600,
        //	ms:     1,
        //	cursor: {
        //		x: false,
        //		y: false,
        //	},
        series: [
          {},
          {
            label: "CPU",
            scale: "%",
            value: (u: any, v: any) => v == null ? "-" : v.toFixed(1) + "%",
            stroke: "red",
            width: 1 / devicePixelRatio,
          },
          {
            label: "RAM",
            scale: "%",
            value: (u: any, v: any) => v == null ? "-" : v.toFixed(1) + "%",
            stroke: "blue",
            width: 1 / devicePixelRatio,
          },
          {
            label: "TCP Out",
            scale: "mb",
            value: (u:any, v:any) => v == null ? "-" : v.toFixed(2) + " MB",
            stroke: "green",
            width: 1 / devicePixelRatio,
          }
        ],
        axes: [
          {},
          {
            scale: "%",
            values: (u: any, vals: number[], space: any) => vals.map(v => +v.toFixed(1) + "%"),
          },
          {
            side: 1,
            scale: "mb",
            size: 60,
            values: (u: any, vals: number[], space: any) => vals.map(v => +v.toFixed(2) + " MB"),
            grid: {show: false},
          },
        ],
      };
      // @ts-ignore
      this.uplot = new uPlot(opts, data, this.chartElement.nativeElement);
      // @ts-ignore
      //let uplot = new uPlot(opts, data, this.chartElement.nativeElement);
    }
  }
  ngOnChanges() {

  }
}
