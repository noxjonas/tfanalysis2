import {Component, OnInit, Input, OnChanges, SimpleChanges, NgZone, AfterViewInit, Inject, PLATFORM_ID, ViewChild, ElementRef} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {CommonService, PeakData, TransitionData} from '../../common.service';
import {SampleInfo} from '../../sample-info/sample-info.component';
import {Observable} from 'rxjs';
import {TransitionProcessingSettings} from '../../processing-settings/processing-settings.component';

// https://github.com/plotly/angular-plotly.js/blob/master/README.md

// TODO: For speed consider simplifiedProcessing attribute of series

// tslint:disable-next-line:class-name
// interface xy {
//   x: number;
//   y: number;
// }

// class SeriesData {
//   constructor(
//     data: {
//       x: number;
//       y: number;
//     }[],
//     label: string,
//   ) {}
// }

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
  @Input() samples: SampleInfo[];
  @Input() peaks: PeakData[];
  @Input() transitionProcessingSettings: TransitionProcessingSettings;

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
    layout: {
      width: 900,
      height: 400,
      // TODO: if title is really important...: https://plotly.com/javascript/configuration-options/ -> Editable mode
      title: '',
      margin: {
        l: 80,
        r: 50,
        b: 50,
        t: 0,
        pad: 4
      },
      xaxis: {
        title: {
          text: 'x axis',
        },
      },
      yaxis: {
        fixedrange: true,
        title: {
          text: 'y axis',
        },
      },
      shapes: [] as any,
    }
  };

  config = {displayModeBar: false};

  constructor(@Inject(PLATFORM_ID) private platformId: any, private zone: NgZone,
              private commonService: CommonService) {
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
    // Separate into functions that do different things dependent on change
    if (changes.plotDataType) {
      this.changeChartData(changes.plotDataType.currentValue);
    }
    if (changes.filterPosArr) {
      // react to changes in filters
      this.filterChartLegend(changes.filterPosArr.currentValue);
    }
    if (changes.transitionData) {
      this.makeChart();
      // TODO: this doesn't actually do anything?
      // setTimeout(() =>
      //   {
      //     this.makeChart();
      //   },
      //   1);
    }

    if (changes.peaks) {
      this.drawPeaks();
    }

    if (changes.transitionProcessingSettings) {
      this.assignLabels();
    }

    if (changes.samples && this.graph.data[0].meta !== 'loading') {
      this.applyColors();
    }
  }

  // TODO: add selection whether to show raw data or not... does not add anything? that's what the preview is for

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
        line: {
          width: 4,
        },
        marker: {
          color: 'red',
        },
        meta: sample.pos,
      });
      }
    );
    this.graph.data = newData;
    // this.graph = {
    //   data: newData,
    //   layout: {width: 800, height: 500, title: 'Transition plots'}
    // };
    this.filterChartLegend(this.filterPosArr);
    this.applyColors();
    // this.revision = 0;

  }

  clearChart(): void {
    // adding dummy data so that following functions don't break, TODO: though I could just not execute them if there's no data..
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
    this.graph.layout.shapes = [];
    this.revision += 1;
  }

  changeChartData(dataType: string): void {
    this.graph.data.forEach((data, index) => {
      // tslint:disable-next-line:no-string-literal
      data.y = this.transitionData[index][dataType + '_y'];
    });
    this.revision += 1;
  }

  // TODO: rename? why only legend?
  filterChartLegend(displayedSamples: string[]): void {
    const visibility = (pos: string, displayed: string[]) => {
      return displayed.includes(pos);
    };

    this.graph.data.forEach((data, index) => {
      // tslint:disable-next-line:no-string-literal
      data.visible = displayedSamples.includes(data.meta);
    });
    this.adjustPeakVisibility();
  }

  applyColors(): void {
    this.seriesColours = [];
    // Get displayed samples; tsignore for flatmap TODO: doesn't compiler already include es2019?
    // @ts-ignore
    const displayedSamples: SampleInfo[] = this.samples.flatMap(x => this.filterPosArr.includes(x.pos) ? x : []);
    const displayedSamplesPos = displayedSamples.map(x => x.pos);

    // Check if grouping is used; i.e. there must be more than 1 group
    const groups = [...new Set(this.samples.map(x => x.group))].sort();
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
      this.seriesColours = this.samples.map((sample, i) => {
        if (displayedSamplesPos.includes(sample.pos)) {
          return {pos: sample.pos, color: extendedColourArr[i + offset]};
        } else {
          offset += 1;
          return {pos: sample.pos, color: '#ffffff'};
        }
      });

    } else {
      // TODO: if groups were unselected - recoloured - reselected = white invisible curves are show
      const visibleGroups = [...new Set(displayedSamples.map(x => this.filterPosArr.includes(x.pos) ? x.group : null))].sort();
      const groupsColourMap: any = [];
      visibleGroups.forEach((_GROUP, _INDEX) => {
        const _COLOURS = this.defaultColours[Object.keys(this.defaultColours)[_INDEX % Object.keys(this.defaultColours).length]];
        const _COLOURS_EXTENDED = [];
        for (let i = 0; i <= Math.ceil( this.samples.filter(sample => sample.group === _GROUP).length / _COLOURS.length ); i++) {
          _COLOURS_EXTENDED.push(..._COLOURS);
        }
        groupsColourMap.push({group: _GROUP, colours: _COLOURS_EXTENDED.reverse()});
      });

      this.seriesColours = this.samples.map((sample, i) => {
        if (groupsColourMap.map((x: any) => x.group).includes(sample.group)) {
          return {pos: sample.pos, color: groupsColourMap.find((x: any) => x.group === sample.group).colours.pop()};
        } else {
          return {pos: sample.pos, color: '#1f1f1f'};
        }
      });
    }

    // update marker colour
    this.graph.data.forEach((data, index) => {
      this.graph.data[index].marker.color = this.seriesColours.find(item => item.pos === data.meta).color;
    });
    // and also shape colour
    this.graph.layout.shapes.forEach((data: any, index: number) => {
      this.graph.layout.shapes[index].line.color = this.seriesColours.find(item => item.pos === data.meta).color;
    });


    this.revision += 1;

    // an array should be returned in same order and length as sample info, since pos will be used to map colour
    //  to both scatter points and the v-lines
  }

  drawPeaks(): void {
    console.log('peak data imported and is to be drawn', this.peaks, this.seriesColours);

    if (!this.peaks) {
      return;
    }

    // Clear previous peaks
    this.graph.layout.shapes = [];

    this.peaks.forEach((data, index) => {
      for (const i in data.x) {
        if (data.x.hasOwnProperty(i)) {
          this.graph.layout.shapes.push(
            {
              type: 'line',
              yref: 'paper',
              x0: data.x[i],
              y0: 0,
              x1: data.x[i],
              y1: 1,
              // todo: visiblity based on filters
              meta: data.pos,
              visible: this.filterPosArr.includes(data.pos),
              line: {
                color: this.seriesColours.find(item => item.pos === data.pos).color,
                width: 3,
                dash: '2px,2px'
              }
            }
          );
        }
      }
    });
    console.log(this.graph.layout);
    this.adjustPeakVisibility();

  }

  adjustPeakVisibility(): void {
    // Ignore below since .visible can be a boolean as well as 'legendonly'
    // @ts-ignore
    const visibility = this.graph.data.map(x => ({pos: x.meta, visible: (x.visible === 'legendonly' ? false : x.visible)}));
    this.graph.layout.shapes.forEach((shape: any, index: number) => {
      this.graph.layout.shapes[index].visible = visibility.find(item => item.pos === shape.meta).visible;
    });
    this.revision += 1;
  }

  assignLabels(): void {
    // assign labels
    if (this.transitionProcessingSettings.x_unit.length > 1 && this.transitionProcessingSettings.x_label.length > 1) {
      this.graph.layout.xaxis.title.text = this.transitionProcessingSettings.x_label + ', ' + this.transitionProcessingSettings.x_unit;
    } else if (this.transitionProcessingSettings.x_unit.length > 1) {
      this.graph.layout.xaxis.title.text = this.transitionProcessingSettings.x_unit;
    } else if (this.transitionProcessingSettings.x_label.length > 1) {
      this.graph.layout.xaxis.title.text = this.transitionProcessingSettings.x_label;
    }

    if (this.transitionProcessingSettings.y_unit.length > 1 && this.transitionProcessingSettings.y_label.length > 1) {
      this.graph.layout.yaxis.title.text = this.transitionProcessingSettings.y_label + ', ' + this.transitionProcessingSettings.y_unit;
    } else if (this.transitionProcessingSettings.y_unit.length > 1) {
      this.graph.layout.yaxis.title.text = this.transitionProcessingSettings.y_unit;
    } else if (this.transitionProcessingSettings.y_label.length > 1) {
      this.graph.layout.yaxis.title.text = this.transitionProcessingSettings.y_label;
    }
  }


}
