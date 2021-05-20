import { Component, OnInit, ViewChild, ElementRef  } from '@angular/core';
import { HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FileUploadService } from './file-upload.service';

import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {
  myFiles:string [] = [];

  fileUploadForm = new FormGroup({
    name: new FormControl(''),
    user: new FormControl(''),
    notes: new FormControl(''),
    files: new FormControl(''),
  });
  // files = new FormControl(Files);


  constructor(private fileUploadService: FileUploadService) { }


  ngOnInit() {

  }

  onSubmit() {
    console.log('this is upload form!', this.fileUploadForm.value.files[0]);
    console.log('this is my files!', this.myFiles);
    console.log('this is my name!', this.fileUploadForm.value.name);
    this.fileUploadService.uploadFile(this.myFiles, this.fileUploadForm)
          .subscribe(data => {
            console.log(data)
          });
  }

  onFileChange(event: any) {
    this.myFiles = [];
    for (let i = 0; i < event.target.files.length; i++) {
        this.myFiles.push(event.target.files[i]);
    }
    console.log('these are the files', this.myFiles);
  }

}

interface FileToUpload {
    name: string;
    file: string;
}
