import {Component, Input, OnInit, Output, ViewChild, OnChanges, SimpleChanges} from '@angular/core';
import {FormGroup, FormControl, FormGroupDirective} from '@angular/forms';
import { Parsers } from '../common.service';
import { CommonService } from '../common.service';
import { Validators } from '@angular/forms';
import { EventEmitter } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit, OnChanges {

  @Input() parsers: Parsers[];

  selectedParser: Parsers;
  files: File[] = [];
  extensionWarning: boolean;

  fileUploadForm = new FormGroup({
    parser: new FormControl(''),
    name: new FormControl('', [Validators.required]),
    user: new FormControl(''),
    notes: new FormControl(''),
    files: new FormControl([]),
    project: new FormControl(''),
    autoprocess: new FormControl(true),
  });

  constructor(private commonService: CommonService) {}

  ngOnInit(): void {
    this.commonService.fetchParsers();
    this.fileUploadForm.get('parser').valueChanges
      .subscribe((formValue) => {
        this.selectedParser = this.parsers.find(i => i.python_class_name === formValue);
        this.checkExtensions();
      });
    this.commonService.dataImportSuccess$.subscribe(_ => {
      this.resetUploadForm();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.parsers && changes.parsers) {
      this.fileUploadForm.get('parser').setValue(this.parsers.slice(-1)[0].python_class_name);
    }
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
    // this.rawUploadInProgress$.emit(true);
    this.fileUploadForm.get('files').setValue(this.files);
    this.commonService.uploadDataFiles(this.fileUploadForm);
    // TODO: RESET FORM ON SUCCESSFUL UPLOAD
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

}
