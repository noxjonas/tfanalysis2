import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-standard-error-dialog',
  templateUrl: './standard-error-dialog.component.html',
  styleUrls: ['./standard-error-dialog.component.css']
})
export class StandardErrorDialogComponent implements OnInit {
  showGenericError: boolean;

  constructor(public dialogRef: MatDialogRef<StandardErrorDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit(): void {
    if (!this.data.caller) {
      this.showGenericError = true;
    }
  }

}
