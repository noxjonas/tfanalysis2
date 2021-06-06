import {Component, EventEmitter, OnInit, OnChanges, Output, Input, SimpleChanges} from '@angular/core';
import {CommonService, TransitionData} from '../../common.service';
import {SampleInfo} from '../../sample-info/sample-info.component';
import {TransitionProcessingSettings} from '../processing-settings.component';

// Need sample info to generate sample selection; add button to randomize three samples
// Need raw data
// Need processed data

// Raw and processed data should be serialised as one


@Component({
  selector: 'app-data-preview',
  templateUrl: './data-preview.component.html',
  styleUrls: ['./data-preview.component.css']
})
export class DataPreviewComponent implements OnInit, OnChanges {
  @Input() previewData!: TransitionData[];
  @Input() sampleInfo!: SampleInfo[];
  @Input() transitionProcessingSettings!: TransitionProcessingSettings;

  revision = 0;
  seriesColours = ['#7f7f7f', '#1f77b4', '#ff7f0e'];

  commonConfig = {displayModeBar: false};

  public rawGraph = {
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
      width: 700,
      height: 200,
      margin: {
        l: 80,
        r: 50,
        b: 25,
        t: 0,
        pad: 4
      },
      xaxis: {
        title: {
          text: '',
        },
        range: [0, 100],
      },
      yaxis: {
        title: {
          text: 'y1 Axis',
        },
      },
    }};

  public normalGraph = {
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
      width: 700,
      height: 200,
      margin: {
        l: 80,
        r: 50,
        b: 25,
        t: 0,
        pad: 4
      },
      xaxis: {
        title: {
          text: '',
        },
        range: [0, 100],
      },
      yaxis: {
        title: {
          text: 'y2 Axis',
        },
      },

    }};

  public firstDerGraph = {
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
      width: 700,
      height: 200,
      margin: {
        l: 80,
        r: 50,
        b: 50,
        t: 0,
        pad: 4
      },
      xaxis: {
        title: {
          text: 'x Axis',
        },
        range: [0, 100],
      },
      yaxis: {
        title: {
          text: 'y3 Axis',
        },
      },
    }};

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log('I am probably getting null changes?', changes)
    if (changes.previewData && this.previewData) {
      if (!changes.previewData.firstChange) {
        console.log('I should happen now only ');
        this.makeGraphs();
      }
    }
  }

  makeGraphs(): void {
    const rawData: any[] = [];
    const normalData: any[] = [];
    const firstDerData: any[] = [];
    this.previewData.forEach((sample, index) => {
      rawData.push({
          x: sample.raw_x,
          y: sample.raw_y,
          name: sample.pos,
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: this.seriesColours[index]
          },
          meta: sample.pos,
        });
      rawData.push({
        x: sample.regular_x,
        y: sample.regular_y,
        name: sample.pos,
        type: 'scatter',
        mode: 'lines',
        marker: {
          color: this.seriesColours[index]
        },
        meta: sample.pos,
      });
      normalData.push({
        x: sample.regular_x,
        y: sample.normal_y,
        name: sample.pos,
        type: 'scatter',
        mode: 'lines',
        marker: {
          color: this.seriesColours[index]
        },
        meta: sample.pos,
      });
      firstDerData.push({
        x: sample.regular_x,
        y: sample.first_der_y,
        name: sample.pos,
        type: 'scatter',
        mode: 'lines',
        marker: {
          color: this.seriesColours[index]
        },
        meta: sample.pos,
      });
    });
    // this.graph.data = newData;

    this.rawGraph.data = rawData;
    this.normalGraph.data = normalData;
    this.firstDerGraph.data = firstDerData;

    this.styleGraphs();

    this.revision += 1;
  }

  styleGraphs(): void {
    // get min max and add some padding
    const max = Math.max(...this.rawGraph.data.map(data => data.x[data.x.length - 1])) * 1.025;
    const min = Math.min(...this.rawGraph.data.map(data => data.x[0])) - max * 0.025;

    this.rawGraph.layout.xaxis.range = [min, max];
    this.normalGraph.layout.xaxis.range = [min, max];
    this.firstDerGraph.layout.xaxis.range = [min, max];

    // assign labels
    if (this.transitionProcessingSettings.x_unit.length > 1 && this.transitionProcessingSettings.x_label.length > 1) {
      this.firstDerGraph.layout.xaxis.title.text = this.transitionProcessingSettings.x_label + ', ' + this.transitionProcessingSettings.x_unit;
    } else if (this.transitionProcessingSettings.x_unit.length > 1) {
      this.firstDerGraph.layout.xaxis.title.text = this.transitionProcessingSettings.x_unit;
    } else if (this.transitionProcessingSettings.x_label.length > 1) {
      this.firstDerGraph.layout.xaxis.title.text = this.transitionProcessingSettings.x_label;
    }

    if (this.transitionProcessingSettings.y_unit.length > 1 && this.transitionProcessingSettings.y_label.length > 1) {
      this.rawGraph.layout.yaxis.title.text = this.transitionProcessingSettings.y_label + ', ' + this.transitionProcessingSettings.y_unit;
    } else if (this.transitionProcessingSettings.y_unit.length > 1) {
      this.rawGraph.layout.yaxis.title.text = this.transitionProcessingSettings.y_unit;
    } else if (this.transitionProcessingSettings.y_label.length > 1) {
      this.rawGraph.layout.yaxis.title.text = this.transitionProcessingSettings.y_label;
    }

    this.normalGraph.layout.yaxis.title.text = 'Normalised';
    this.firstDerGraph.layout.yaxis.title.text = 'First derivative';

  }

}
