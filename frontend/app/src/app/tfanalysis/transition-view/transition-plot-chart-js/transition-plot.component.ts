// import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
// import {
//   ChartDataSets,
//   ChartType,
//   ChartOptions,
//   Scriptable,
//   PointStyle,
//   ChartColor,
//   PositionType,
//   ChartLegendLabelItem, ChartLegendLabelOptions
// } from 'chart.js';
// import { Label } from 'ng2-charts';
// import {CommonService, TransitionData} from "../../common.service";
// import {SampleInfo} from "../../sample-info/sample-info.component";
//
// interface xy {
//   x: number;
//   y: number;
// }
//
// class SeriesData {
//   constructor(
//     data: {
//       x: number;
//       y: number;
//     }[],
//     label: string,
//   ) {}
// }
//
// class DefaultColours {
//   grey = ['#7f7f7f', '#a8a8a8', '#535353', '#939393', '#696969'];
//   blue = ['#1f77b4', '#7ba2cd', '#204e74', '#568cc1', '#216293'];
//   orange = ['#ff7f0e', '#ffaf71', '#a45415', '#ff9848', '#d06913'];
//   green = ['#2ca02c', '#7ec073', '#256822', '#5ab051', '#298427'];
//   red = ['#d62728', '#ef7b6a', '#8b221d', '#e45648', '#b02623'];
//   purple = ['#9467bd', '#b998d3', '#61457a', '#a77fc8', '#7a569b'];
//   brown = ['#8c564b', '#b48b83', '#5c3a33', '#a07066', '#74483f'];
//   pink = ['#e377c2', '#efa6d6', '#e98fcc', '#914f7d', '#b9639f'];
//   yellow = ['#bcbd22', '#d7d275', '#7a7a1f', '#cac850', '#9a9b21'];
//   teal = ['#17becf', '#84d4df', '#227a85', '#5dc9d7', '#209ca9'];
// }
// interface GenericColours {
//   [index: string]: any;
// }
//
// interface SeriesColours {
//   pos: string,
//   color: string,
//   [index: string]: string;
// }
//
// // options.elements.point should allow me to set general params for all points
//
//
// @Component({
//   selector: 'app-transition-plot',
//   templateUrl: './transition-plot.component.html',
//   styleUrls: ['./transition-plot.component.css']
// })
// export class TransitionPlotComponent implements OnInit, OnChanges {
//   @Input() transitionData!: TransitionData[];
//   @Input() plotDataType!: string;
//   @Input() filterPosArr!: string[];
//   @Input() samples: SampleInfo[] = [];
//   defaultColours = <GenericColours>{
//     // Arrays defining each base colour must have identical lengths
//     grey : ['#7f7f7f', '#a8a8a8', '#535353', '#939393', '#696969'],
//     blue : ['#1f77b4', '#7ba2cd', '#204e74', '#568cc1', '#216293'],
//     orange : ['#ff7f0e', '#ffaf71', '#a45415', '#ff9848', '#d06913'],
//     green : ['#2ca02c', '#7ec073', '#256822', '#5ab051', '#298427'],
//     red : ['#d62728', '#ef7b6a', '#8b221d', '#e45648', '#b02623'],
//     purple : ['#9467bd', '#b998d3', '#61457a', '#a77fc8', '#7a569b'],
//     brown : ['#8c564b', '#b48b83', '#5c3a33', '#a07066', '#74483f'],
//     pink : ['#e377c2', '#efa6d6', '#e98fcc', '#914f7d', '#b9639f'],
//     yellow : ['#bcbd22', '#d7d275', '#7a7a1f', '#cac850', '#9a9b21'],
//     teal : ['#17becf', '#84d4df', '#227a85', '#5dc9d7', '#209ca9'],
//   }
//   seriesColours: SeriesColours[] = [];
//
//   // align?: 'center' | 'end' | 'start';
//   // display?: boolean;
//   // position?: PositionType;
//   // fullWidth?: boolean;
//   // onClick?(event: MouseEvent, legendItem: ChartLegendLabelItem): void;
//   // onHover?(event: MouseEvent, legendItem: ChartLegendLabelItem): void;
//   // onLeave?(event: MouseEvent, legendItem: ChartLegendLabelItem): void;
//   // labels?: ChartLegendLabelOptions;
//   // reverse?: boolean;
//   // rtl?: boolean;
//   // textDirection?: string;
//
//   // scatter
//   public scatterChartOptions: ChartOptions = {
//     responsive: true,
//     animation: null,
//     legend: {
//       align: 'start',
//       fullWidth: false,
//       position: 'right',
//
//     },
//     hover: {
//       mode: null
//     },
//     elements: {
//       point: {
//         radius: 5,
//         pointStyle: 'circle',
//         borderWidth: 0,
//         hoverBorderWidth: 0,
//         hoverRadius: 5
//       }
//     },
//     plugins: {
//       legend: {
//         labels: {
//           usePointStyle: true,
//         },
//       }
//     }
//   };
//   // public scatterChartLabels: Label[] = ['Eating', 'Drinking', 'Sleeping', 'Designing', 'Coding', 'Cycling', 'Running'];
//
//   public scatterChartData: ChartDataSets[] = [];
//   public scatterChartType: ChartType = 'scatter';
//
//   constructor(private commonService: CommonService) {
//     commonService.transitionsProcessed$.subscribe(data => this.ngOnInit());
//   }
//
//   ngOnInit(): void {
//     this.generateColors();
//     this.applyData();
//   }
//
//   ngOnChanges(changes: SimpleChanges) {
//     console.log('These are the changes that are happening:', changes)
//     // Separate into functions that do different things dependent on change
//     if (changes.plotDataType) {
//       // update plot data
//       //this.generateColors();
//       //this.applyData();
//     }
//     if (changes.filterPosArr) {
//       // react to changes in filters
//     }
//     if (changes.transitionData) {
//       // apply changes when the data changes
//       // i.e. remake the chart and colouring
//     }
//   }
//
//   generateColors () {
//     // Should colours be recalculated based on visible filters?
//     // Probably yes, otherwise you can easily end up with very few distinct colours
//     // Also, filtered samples will not be displayed, so I don't even have to change their colours
//     // Remember to assign, white or any colour to the filtered out samples as this must have the same dimensions
//
//     // Get displayed samples
//     // @ts-ignore
//     let displayedSamples: SampleInfo[] = this.samples.flatMap(x => this.filterPosArr.includes(x.pos) ? x : []);
//     let displayedSamplesPos = displayedSamples.map(x => x.pos)
//
//     // Check if grouping is used; i.e. there must be more than 1 group
//     let groups = [...new Set(displayedSamples.map(x => x.group))].sort()
//     console.log('groups', groups)
//     if (groups.length < 2) {
//       // just make simple array of colours
//       let simpleColourArr = [];
//       for (let i = 0; i < this.defaultColours[Object.keys(this.defaultColours)[0]].length; i++) {
//         for (let prop in this.defaultColours) {
//           if (Object.prototype.hasOwnProperty.call(this.defaultColours, prop)) {
//             simpleColourArr.push(this.defaultColours[prop][i])
//           }
//         }
//       }
//       // multiply this array to make sure there are enough colours to cover all samples
//       let extendedColourArr: string[] = []
//       for (let i = 0; i <= Math.ceil( this.samples.length / simpleColourArr.length ); i++) {
//         extendedColourArr.push(...simpleColourArr)
//       }
//
//       let offset = 0;
//       this.seriesColours = this.samples.map((x, i) => {
//         if (displayedSamplesPos.includes(x.pos)) {
//           return {pos: x.pos, color: extendedColourArr[i+offset]}
//         } else {
//           offset += 1;
//           return {pos: x.pos, color: '#ffffff'}
//         }
//       })
//
//       console.log('colourMap', this.seriesColours)
//     }
//
//
//
//     // an array should be returned in same order and length as sample info, since pos will be used to map colour
//     //  to both scatter points and the v-lines
//   }
//
//
//   // events
//   public chartClicked({ event, active }: { event: MouseEvent, active: {}[] }): void {
//     console.log(event, active);
//   }
//
//   public chartHovered({ event, active }: { event: MouseEvent, active: {}[] }): void {
//     console.log(event, active);
//   }
//
//   applyData() {
//     // arr = ['raw', 'regular', 'smooth', 'normal', 'first_der']
//     const {selectedX, selectedY} = (() => {
//       if (this.plotDataType == 'raw') {
//         return {selectedX: 'scatter_raw_x', selectedY: 'scatter_raw_y'}
//       } else {
//         return {selectedX: 'scatter_regular_x', selectedY: 'scatter_'+this.plotDataType+'_y'}
//       }
//     }) ()
//
//     let data: SeriesData[] = [];
//
//     this.transitionData.forEach((series, i) => {
//       let x = series[selectedX]
//       let y = series[selectedY]
//       const zip = (a: number[], b: number[]) => a.map((k: number, i: number) => <xy>{x: k, y: b[i]});
//       data.push(<SeriesData>{
//         data: zip(x, y),
//         label: series.pos,
//         //pointRadius: 5,
//         //fill: true,
//         //borderColor: '#7f7f7f',
//         //backgroundColor: '#7f7f7f',
//         //borderWidth: 0,
//         //pointStyle: 'circle',
//         pointBorderColor: this.seriesColours[i].color,
//         pointBackgroundColor: this.seriesColours[i].color,
//         //pointHoverRadius: 5,
//         pointHoverBackgroundColor: this.seriesColours[i].color
//       })
//     })
//     this.scatterChartData = data
//   }
//
// }
