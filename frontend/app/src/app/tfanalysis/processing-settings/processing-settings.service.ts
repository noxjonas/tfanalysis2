import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Observable} from "rxjs";
import {ProcessingSettings} from "./processing-settings.component";
import {environment} from "../../../environments/environment";
import {CommonService} from "../common.service";
import {SampleInfo} from "../sample-info/sample-info.component";


@Injectable({
  providedIn: 'root'
})
export class ProcessingSettingsService {

  constructor(private commonService: CommonService,
              private http: HttpClient) {}

  fetchProcessingSettings(): Observable<any> {
    const selectedExperiment = this.commonService.getSelectedExperiment();
    const formData = new FormData()
    formData.append('experiment_id', String(selectedExperiment.id))
    return this.http.post<ProcessingSettings>(environment.baseApiUrl + 'tfanalysis/fetchprocessingsettings/', formData)
  }

  updateProcessingSettings(processingInfo: any): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    console.log('what does processing info look like', processingInfo)
    return this.http.put<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/updateprocessingsettings/', processingInfo)
  }

}
