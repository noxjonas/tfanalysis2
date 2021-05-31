import { Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { Experiment } from '../common.service';


@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(private http: HttpClient) { }

  uploadRawFiles(files: any[], info: FormGroup): Observable<any> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    formData.append('parser', info.value.parser);
    formData.append('name', info.value.name);
    formData.append('user', info.value.user);
    formData.append('project', info.value.project);
    formData.append('notes', info.value.notes);
    return this.http.post<Experiment>(environment.baseApiUrl + 'tfanalysis/upload/', formData);
  }
}

