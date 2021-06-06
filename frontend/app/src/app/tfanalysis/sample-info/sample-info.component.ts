import {Component, OnInit, AfterViewInit, EventEmitter} from '@angular/core';
import * as Handsontable from 'handsontable';
import { SampleInfoService } from "./sample-info.service";
import {CommonService} from "../common.service";
import {MatTableDataSource} from "@angular/material/table";
import {SelectExperimentService} from "../select-experiment/select-experiment.service";
// import { HotTableModule } from "@handsontable/angular";
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { HotTableRegisterer } from '@handsontable/angular';

export interface SampleInfo {
  raw_data_id: number,
  updated: string,
  pos: string,
  code: string,
  name: string,
  description: string,
  buffer: string,
  condition: string,
  concentration: string,
  unit: string,
  group: string,
  manual_outlier: boolean,
  is_blank: boolean,
  [index: string]:any
}

interface BulkReplicatesOptions {
  value: number;
  viewValue: string;
}

interface ColumnReplicatesOptions {
  value: string;
}

@Component({
  selector: 'app-sample-info',
  templateUrl: './sample-info.component.html',
  styleUrls: ['./sample-info.component.css']
})
export class SampleInfoComponent implements OnInit {
  samples: SampleInfo[] = [];
  hotSettings: Handsontable.default.GridSettings = {
    rowHeaders: true,
    colHeaders: true,
    stretchH: 'all',
    // rowHeights: 24,
    // preventOverflow: 'vertical',
    colWidths: [55, 80, 80, 80, 80, 80, 80],
    rowHeights: [24], // <-- this one sets fixed row height
    manualColumnResize: true,
    manualRowResize: true,
    width: 1000,
  };
  private hotRegisterer = new HotTableRegisterer();
  id = 'sample-info';

  bulkReplicatesOptions: BulkReplicatesOptions[] = [
    {value: 2, viewValue: 'Two replicates'},
    {value: 3, viewValue: 'Three replicates'},
    {value: 4, viewValue: 'Four replicates'},
    {value: 5, viewValue: 'Five replicates'},
  ];
  columnReplicatesOptions: ColumnReplicatesOptions[] = [
    {value: 'pos'}, {value: 'code'}, {value: 'name'},
    {value: 'description'}, {value: 'buffer'}, {value: 'condition'},
    {value: 'concentration'}, {value: 'unit'}
  ]
  autoGroupingForm = new FormGroup({
    bulk: new FormControl(null),
    everyOther: new FormControl(null),
    column: new FormControl(null),
  });
  groupColIndex = 8;

  constructor(private sampleInfoService: SampleInfoService,
              private commonService: CommonService) {
    commonService.experimentSelected$.subscribe(experiment => this.ngOnInit());
    commonService.sampleInfoChanged$.subscribe(data => {
      this.samples = data;
      this.hotSettings.height = this.samples.length*24+24;
    });
  }

  ngOnInit(): void {
    this.samples = [];
    if (this.commonService.selected) {
      this.importSampleInfo()
    }
  }

  importSampleInfo() {
    this.commonService.fetchSampleInfo()
  }

  groupSamples() {
    let newData:any = []
    if (this.autoGroupingForm.value.bulk != null) {

      let counter = 0;
      for (let i = 0; i < this.samples.length; i++) {
        if (i%this.autoGroupingForm.value.bulk == 0) {
          counter++;
        }
        newData.push([i, this.groupColIndex, String(counter)])
      }
    }

    if (this.autoGroupingForm.value.everyOther != null) {
      let counter = 0;
      for (let i = 0; i < this.samples.length; i++) {
        if (i%this.autoGroupingForm.value.everyOther == 0) {
          counter = 0;
        }
        counter++;
        newData.push([i, this.groupColIndex, String(counter)])
      }
    }

    if (this.autoGroupingForm.value.column != null) {
      let colData = this.hotRegisterer.getInstance(this.id).getDataAtCol(
        this.hotRegisterer.getInstance(this.id).propToCol(this.autoGroupingForm.value.column)
      )

      let unique = colData.filter((item, i, ar) => ar.indexOf(item) === i);

      let counter: number;
      for (let i = 0; i < this.samples.length; i++) {
        counter = unique.indexOf(colData[i]) + 1
        newData.push([i, this.groupColIndex, String(counter)])
      }
    }
    this.hotRegisterer.getInstance(this.id).setDataAtCell(newData)
  }

  clearOtherGroupingOptions(selected: string) {
    console.log('clearing', selected);

    for (let field of ['bulk', 'everyOther', 'column']) {
      if (selected != field) {
        this.autoGroupingForm.controls[field].setValue(null);
      }
    }
  }

  saveSampleInfo() {
    let tableData = this.hotRegisterer.getInstance(this.id).getSourceData()
    this.commonService.postSampleInfo(tableData).subscribe(
      data => {
        console.log('sample info saved', data);
      }
    )
  }

}
