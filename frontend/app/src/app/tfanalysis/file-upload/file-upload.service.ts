import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpErrorResponse, HttpEventType } from  '@angular/common/http';
import { map } from  'rxjs/operators';
import { environment } from '../../../environments/environment'

import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';


@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(private http: HttpClient) { }

  uploadFile(files: any[], info: FormGroup): Observable<any> {
    const formData = new FormData()
    for (let file of files) {
      formData.append('files', file, file.name)
    }
    formData.append('name', info.value.name)
    formData.append('user', info.value.user)
    formData.append('notes', info.value.notes)
    return this.http.post(environment.baseApiUrl+'tfanalysis/upload/', formData)
  }
}

