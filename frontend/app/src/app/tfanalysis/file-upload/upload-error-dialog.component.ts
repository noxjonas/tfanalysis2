import { Component, OnInit, Inject } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-upload-error-dialog',
  templateUrl: './upload-error-dialog.component.html',
})
export class UploadErrorDialogComponent {

  constructor(public dialogRef: MatDialogRef<UploadErrorDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) {
  }

}
