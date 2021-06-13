import {Component, Inject, OnInit} from '@angular/core';
import {CommonService} from '../../common.service';
import {AvailableScreens, SampleInfoUploadService} from './sample-info-upload.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormControl, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';

@Component({
  selector: 'app-sample-info-screen-export-dialog',
  templateUrl: './sample-info-screen-export-dialog.component.html',
  styleUrls: ['./sample-info-screen-export-dialog.component.css']
})
export class SampleInfoScreenExportDialogComponent implements OnInit {

  newScreenName = new FormControl('', [Validators.required]);

  columns = ['screen_name', 'updated', 'count', 'delete'];
  // dataSource: AvailableScreens[] = [];

  dataSource = new MatTableDataSource([]);

  notUniqueError = false;

  confirm: string;


  constructor(
    private commonService: CommonService,
    private sampleInfoUploadService: SampleInfoUploadService,
    public dialogRef: MatDialogRef<SampleInfoScreenExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
    this.fetchAvailableScreens();
    this.newScreenName.valueChanges.subscribe(data => {
      this.notUniqueError = this.dataSource.data.map(x => x.screen_name).includes(this.newScreenName.value);
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  saveScreen(): void {
    // Check if name is not already used
    if (this.dataSource.data.map(x => x.screen_name).includes(this.newScreenName.value) || !this.newScreenName.value) {
      return;
    }

    this.sampleInfoUploadService.saveSampleInfoScreen(this.data, this.newScreenName.value).subscribe(data => {
      this.dataSource.data = data;
      this.newScreenName.setValue('');
    }, error => {
      this.commonService.displayErrorDialog('', error);
    });
  }

  fetchAvailableScreens(): void {
    this.sampleInfoUploadService.fetchAvailableScreens().subscribe(data => {
      this.dataSource.data = data;
    }, error => {
      this.commonService.displayErrorDialog('', error);
    });
  }

  confirmCheck(screenName: string): void {
    this.confirm = screenName;
  }

  deleteScreen(screenName: string): void {
    this.sampleInfoUploadService.deleteScreen(screenName).subscribe(data => {
      this.dataSource.data = data;
      this.confirm = '';
    }, error => {
      this.commonService.displayErrorDialog('', error);
    });
  }


}
