import {Component, OnInit, Output, ViewChild} from '@angular/core';
import { FileUploadService } from './file-upload.service';
import {FormGroup, FormControl, FormGroupDirective} from '@angular/forms';
import { Parsers } from '../common.service';
import { CommonService } from '../common.service';
import { Validators } from '@angular/forms';
import { MatDialog} from '@angular/material/dialog';
import { UploadErrorDialogComponent } from './upload-error-dialog.component';
import { EventEmitter } from '@angular/core';
import Handsontable from 'handsontable';
import validators = Handsontable.validators;

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

  @Output() rawUploadInProgress$ = new EventEmitter<boolean>();
  @Output() rawUploadSuccess$ = new EventEmitter<boolean>();

  parsers: Parsers[];
  selectedParser: Parsers;
  files: File[] = [];
  extensionWarning: boolean;

  fileUploadForm = new FormGroup({
    parser: new FormControl(''),
    name: new FormControl('', [Validators.required]),
    user: new FormControl(''),
    notes: new FormControl(''),
    files: new FormControl(''),
    project: new FormControl(''),
  });

  constructor(
    private fileUploadService: FileUploadService,
    private commonService: CommonService,
    public uploadErrorDialog: MatDialog
  ) {
    this.commonService.parsersReceived$.subscribe( data => {
        this.parsers = commonService.parsers;
        this.fileUploadForm.get('parser').setValue(this.parsers.slice(-1)[0].python_class_name);
    });
  }

  ngOnInit(): void {
    this.commonService.fetchParsers();
    this.fileUploadForm.get('parser').valueChanges
      .subscribe((formValue) => {
        this.selectedParser = this.parsers.find(i => i.python_class_name === formValue);
        this.checkExtensions();
      });
  }

  onFileDropped(event: any): void {
    this.prepareFileList(event);
  }
  fileBrowseHandler(event: any): void {
    this.prepareFileList(event.target.files);
  }
  prepareFileList(files: any): void {
    for (const file of files) {
      this.files.push(file);
    }
    this.checkExtensions();
  }

  deleteFile(index: number): void {
    this.files.splice(index, 1);
    this.checkExtensions();
  }

  formatBytes(bytes: any, decimals?: any): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const dm = decimals <= 0 ? 0 : decimals || 2;
    const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  checkExtensions(): void {
    for (const file of this.files) {
      const extension = file.name.split('.').slice(-1)[0];
      if (!this.selectedParser.accepted_file_types.includes(extension)) {
        this.extensionWarning = true;
        return;
      }
    }
    this.extensionWarning = false;
  }

  onSubmit(): void {
    if (this.files.length < 1 || !this.fileUploadForm.valid) {
      return;
    }
    this.rawUploadInProgress$.emit(true);
    this.fileUploadService.uploadRawFiles(this.files, this.fileUploadForm)
          .subscribe(data => {
            this.resetUploadForm();
            this.rawUploadInProgress$.emit(false);
            this.commonService.selectExperiment(data);
            this.rawUploadSuccess$.emit(true);
          },
                    error => {
            this.rawUploadInProgress$.emit(false);
            this.openDialog(error.error);
          });
  }

  resetUploadForm(): void {
    // Custom one since I don't want to lose selected parser
    for (const formName of ['name', 'user', 'notes', 'files', 'project']) {
      this.fileUploadForm.get(formName).setValue('');
    }
    // None of the abstract control methods to clear the required validator on 'name' work
    // If it's still annoying in the future, look again: https://stackoverflow.com/questions/43759590/angular-reactive-forms-how-to-reset-form-state-and-keep-values-after-submit
    this.files = [];
  }

  openDialog(error: any): void {
    const dialogRef = this.uploadErrorDialog.open(UploadErrorDialogComponent, {
      data: error
    });
    dialogRef.afterClosed().subscribe(result => {
    });
  }

}
