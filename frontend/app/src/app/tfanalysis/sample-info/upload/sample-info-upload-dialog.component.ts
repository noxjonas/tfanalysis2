import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SampleInfoUploadService} from './sample-info-upload.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {SampleInfo} from '../sample-info.component';
import {CommonService} from '../../common.service';
import {MatTableDataSource} from '@angular/material/table';

@Component({
  selector: 'app-sample-info-upload-dialog',
  templateUrl: './sample-info-upload-dialog.component.html',
  styleUrls: ['./sample-info-upload-dialog.component.css']
})
export class SampleInfoUploadDialogComponent implements OnInit {

  displayExtensionError = false;
  containsColumnNames = true;
  fileInputField: string;

  commonPos: string[];
  importedDataLengthWarning = false;

  mapPositions = false;
  overwriteExistingInfo = true;

  dataSource: SampleInfo[];
  columns: string[] = ['clearRow', 'pos', 'code', 'name', 'description', 'buffer', 'condition', 'concentration', 'unit', 'group', 'outlier', 'blank'];

  screenColumns: string[] = ['screen_name', 'updated', 'count', 'select'];
  screenDataSource = new MatTableDataSource([]);

  constructor(
    private commonService: CommonService,
    private sampleInfoUploadService: SampleInfoUploadService,
    public dialogRef: MatDialogRef<SampleInfoUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
    this.sampleInfoUploadService.fetchAvailableScreens().subscribe(data => {
      this.screenDataSource.data = data;
    }, error => {
      this.commonService.displayErrorDialog('', error);
    });
  }

  applyScreenFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.screenDataSource.filter = filterValue.trim().toLowerCase();
  }

  importSelectedScreen(selectedScreen: string): void {
    this.sampleInfoUploadService.fetchScreen(selectedScreen).subscribe(data => {
      console.log('importing screen:', data);
      this.dataSource = data;
      // generate table indexes
      this.dataSource.forEach((row, index) => {
        row.tableIndex = index;
      });
      this.importQC();
    }, error => {
      this.dataSource = [];
      this.commonService.displayErrorDialog('', error);
    });
  }

  onFileDropped(event: any): void {
    this.handleFile(event[0]);
  }
  fileBrowseHandler(event: any): void {
    this.handleFile(event.target.files[0]);
  }

  handleFile(file: File): void {
    this.fileInputField = null;
    if (!file) {
      return;
    }

    if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      this.displayExtensionError = false;
      this.sampleInfoUploadService.uploadSampleInfoFile(file, this.containsColumnNames).subscribe(data => {
        this.dataSource = data;
        // generate table indexes
        this.dataSource.forEach((row, index) => {
          row.tableIndex = index;
        });

        this.importQC();
      }, error => {
        this.dataSource = [];
        this.commonService.displayErrorDialog('', error);
      });
    } else {
      this.displayExtensionError = true;
    }
  }

  dropColumn(event: CdkDragDrop<string[]>): void {
    // Ignore boolean fields, since well there's no point to move them
    if (['clearRow', 'outlier', 'blank'].includes(this.columns[event.currentIndex])
      || ['clearRow', 'outlier', 'blank'].includes(this.columns[event.previousIndex])) {
      return;
    }

    const dataToMove = this.dataSource.map(x => x[this.columns[event.previousIndex]]);
    const dataToReplace = this.dataSource.map(x => x[this.columns[event.currentIndex]]);

    this.dataSource.forEach((row, index) => {
      row[this.columns[event.currentIndex]] = dataToMove[index];
      row[this.columns[event.previousIndex]] = dataToReplace[index];
    });

    this.importQC();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  clearColumn(col: string): void {
    console.log('clearing column', col);
    this.dataSource.forEach(row => {
      row[col] = undefined;
    });

    this.importQC();
  }

  clearRow(tableIndex: number): void {
    const index = this.dataSource.indexOf(this.dataSource.find(x => x.tableIndex === tableIndex));
    this.dataSource.splice(index, 1);
    this.dataSource = [...this.dataSource];

    this.importQC();
  }

  importQC(): void {
    // Check whether positions can be mapped
    this.commonPos = this.data.validPos.filter((value: string) => this.dataSource.map(x => x.pos).includes(value));

    // Check whether data has the same length
    this.importedDataLengthWarning = this.dataSource.length !== this.data.validPos.length;
  }

}
