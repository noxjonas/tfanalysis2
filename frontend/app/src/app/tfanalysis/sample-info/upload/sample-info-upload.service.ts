import { Injectable } from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {environment} from '../../../../environments/environment';
import {CommonService, Experiment} from '../../common.service';
import {HttpClient} from '@angular/common/http';
import {SampleInfo} from '../sample-info.component';
import {Observable} from 'rxjs';
import {SampleInfoUploadDialogComponent} from './sample-info-upload-dialog.component';



export interface SampleInfoScreen {
  id: number;
  screen_name?: string;

  updated?: string;
  pos: string;
  code: string;
  name: string;
  description: string;
  buffer: string;
  condition: string;
  concentration: string;
  unit: string;
  group: string;
  outlier: boolean;
  blank: boolean;
}

export interface AvailableScreens {
  screen_name: string;
  updated: string;
  count: number;
}


@Injectable({
  providedIn: 'root'
})
export class SampleInfoUploadService {



  constructor(
    private http: HttpClient,
    private commonService: CommonService) { }

  uploadSampleInfoFile(file: File, containsColumnNames: boolean): Observable<SampleInfo[]> {
    const formData = new FormData();
    formData.append('files', file, file.name);
    formData.append('column_names', String(containsColumnNames));

    return this.http.post<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/uploadsampleinfo/', formData);
  }

  saveSampleInfoScreen(screen: SampleInfoScreen[], screenName: string): Observable<any> {
    screen.forEach(x => {
      x.screen_name = screenName;
    });
    return this.http.post<AvailableScreens[]>(environment.baseApiUrl + 'tfanalysis/savesampleinfoscreen/', screen);
  }

  fetchAvailableScreens(): Observable<AvailableScreens[]> {
    return this.http.post<AvailableScreens[]>(environment.baseApiUrl + 'tfanalysis/fetchsampleinfoscreensnames/', '');
  }

  deleteScreen(screenName: string): Observable<any> {
    return this.http.post<AvailableScreens[]>(environment.baseApiUrl + 'tfanalysis/deletesampleinfoscreen/', {screen_name: screenName});
  }

  fetchScreen(screenName: string): Observable<any> {
    return this.http.post<SampleInfoScreen[]>(environment.baseApiUrl + 'tfanalysis/fetchsampleinfoscreen/', {screen_name: screenName});
  }

}
