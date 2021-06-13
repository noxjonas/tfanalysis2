import {Component, OnInit, AfterViewInit, EventEmitter, Input, OnChanges, SimpleChanges} from '@angular/core';
import * as Handsontable from 'handsontable';
import {CommonService} from '../common.service';
import {MatTableDataSource} from '@angular/material/table';
// import { HotTableModule } from "@handsontable/angular";
import {FormBuilder, FormGroup, FormControl, FormArray} from '@angular/forms';
import { HotTableRegisterer } from '@handsontable/angular';
import {StandardErrorDialogComponent} from '../error-dialogs/standard-error-dialog/standard-error-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {SampleInfoUploadDialogComponent} from './upload/sample-info-upload-dialog.component';
import {SampleInfoScreenExportDialogComponent} from './upload/sample-info-screen-export-dialog.component';

export interface SampleInfo {
  tableIndex?: number;
  raw_data_id?: number;
  updated?: string;
  pos: string;
  code: string;
  name: string;
  description: string;
  buffer: string;
  condition: string;
  concentration: string;
  unit: string;
  group: string;
  outlier: boolean;
  blank: boolean;
  [index: string]: any;
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
export class SampleInfoComponent implements AfterViewInit, OnChanges {
  @Input() sampleInfo: SampleInfo[];

  hotSettings: Handsontable.default.GridSettings = {
    rowHeaders: true,
    colHeaders: true,
    stretchH: 'all',
    manualColumnResize: true,
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
  ];
  autoGroupingForm = new FormGroup({
    bulk: new FormControl(null),
    everyOther: new FormControl(null),
    column: new FormControl(null),
  });
  groupColIndex = 8;

  selections = new FormArray([new FormControl(null)]);
  autoNamingFormGroup = new FormGroup({
    separator: new FormControl(''),
    selections: this.selections
  });
  namingColumns = [null, 'pos', 'name', 'code', 'description', 'buffer', 'condition', 'concentration', 'unit', 'group'];

  constructor(
    private commonService: CommonService,
    public sampleInfoUploadDialog: MatDialog,
    public sampleInfoScreenExportDialog: MatDialog,
  ) {
    this.commonService.experimentSelected$.subscribe(_ => this.ngAfterViewInit());
  }

  ngAfterViewInit(): void {
    const formArr = this.autoNamingFormGroup.get('selections') as FormArray;
    if (formArr.controls.length < 2) {
      this.addAutoNamingControl();
    }

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.sampleInfo && this.hotRegisterer.getInstance(this.id)) {
      this.hotRegisterer.getInstance(this.id).addHook('afterLoadData', () => {
        this.hotRegisterer.getInstance(this.id).updateSettings({height: this.sampleInfo.length * 24 + 24});
      });
    }
  }

  addAutoNamingControl(): void {
    this.selections.push(new FormControl(null));
  }

  removeAutoNamingControl(): void {
    const formArr = this.autoNamingFormGroup.get('selections') as FormArray;
    if (formArr.controls.length < 3) {
      return;
    }
    formArr.removeAt(formArr.controls.length - 1);
  }

  autoGenerateNames(): void {
    const formArr = this.autoNamingFormGroup.get('selections') as FormArray;

    const selectedColumns = formArr.value.filter((x: any) => x != null);
    if (selectedColumns.length < 1) {
      return;
    }

    this.sampleInfo.forEach(row => {
      const rowValues = selectedColumns.map((x: string) => row[x]).filter((x: any) => !!x);

      row.name = rowValues.join(
        this.autoNamingFormGroup.get('separator').value ? this.autoNamingFormGroup.get('separator').value : ' '
      );
    });
    this.hotRegisterer.getInstance(this.id).render();
  }


  groupSamples(): void {
    const newData: any = [];
    if (this.autoGroupingForm.value.bulk != null) {

      let counter = 0;
      for (let i = 0; i < this.sampleInfo.length; i++) {
        if (i % this.autoGroupingForm.value.bulk === 0) {
          counter++;
        }
        newData.push([i, this.groupColIndex, String(counter)]);
      }
    }

    if (this.autoGroupingForm.value.everyOther != null) {
      let counter = 0;
      for (let i = 0; i < this.sampleInfo.length; i++) {
        if (i % this.autoGroupingForm.value.everyOther === 0) {
          counter = 0;
        }
        counter++;
        newData.push([i, this.groupColIndex, String(counter)]);
      }
    }

    if (this.autoGroupingForm.value.column != null) {
      const colData = this.hotRegisterer.getInstance(this.id).getDataAtCol(
        this.hotRegisterer.getInstance(this.id).propToCol(this.autoGroupingForm.value.column)
      );

      const unique = colData.filter((item, i, ar) => ar.indexOf(item) === i);

      let counter: number;
      for (let i = 0; i < this.sampleInfo.length; i++) {
        counter = unique.indexOf(colData[i]) + 1;
        newData.push([i, this.groupColIndex, String(counter)]);
      }
    }
    this.hotRegisterer.getInstance(this.id).setDataAtCell(newData);
  }

  clearOtherGroupingOptions(selected: string): void {

    for (const field of ['bulk', 'everyOther', 'column']) {
      if (selected !== field) {
        this.autoGroupingForm.controls[field].setValue(null);
      }
    }
  }

  saveSampleInfo(): void {
    this.commonService.updateSampleInfo(this.hotRegisterer.getInstance(this.id).getSourceData());
  }

  displayUploadDialog(): void {
    const dialogRef = this.sampleInfoUploadDialog.open(SampleInfoUploadDialogComponent, {
      data: {validPos: this.sampleInfo.map(x => x.pos)},
      width: '100%',
      height: '90%',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result.data) {
        // Make a copy of sample info to retain ids required to deposit data to db
        const newSampleInfo = this.sampleInfo;
        if (result.mapPositions) {
          // Clear entries from result.data that cannot be mapped
          const commonPos = this.sampleInfo.map(x => x.pos).filter((value: string) => result.data.map((x: any) => x.pos).includes(value));
          result.data = result.data.filter((x: any) => commonPos.includes(x.pos));
          // Populate result.data with missing samples by adding empty data
          const missingPos = this.sampleInfo.map(x => x.pos).filter((value: string) => !result.data.map((x: any) => x.pos).includes(value));
          missingPos.forEach(POS => {
            result.data.push({pos: POS, code: '', name: '', description: '', buffer: '',
              condition: '', concentration: '', unit: '', group: '', outlier: false, blank: false});
          });
          // Rearrange result.data so that it follows the same order as sampleInfo
          result.data.sort((a: any, b: any) => {
            return this.sampleInfo.map(x => x.pos).indexOf(a.pos) - this.sampleInfo.map(x => x.pos).indexOf(b.pos);
          });
        }

        newSampleInfo.forEach((row: any, index: number) => {
          for (const key of Object.keys(result.data[index])) {
            if (key !== 'pos') {
              if (result.overwriteExistingInfo) {
                row[key] = result.data[index][key];
              } else {
                // this will not work with blanks/outliers => skip them entirely
                if (!['outlier', 'blank'].includes(key)) {
                  row[key] = row[key] ? row[key] : result.data[index][key];
                }
              }
            }
          }
        });
        this.sampleInfo = newSampleInfo;
        this.hotRegisterer.getInstance(this.id).render();
      }
    });
  }

  displayScreenExportDialog(): void {
    const dialogRef = this.sampleInfoScreenExportDialog.open(SampleInfoScreenExportDialogComponent, {
      data: this.sampleInfo,
      width: '50%',
      height: '80%',
    });

    dialogRef.afterClosed().subscribe(data => {
      // console.log('Nothing to do upon screen export dialog closure...');
    });
  }

}
