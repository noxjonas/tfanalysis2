import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Observable} from "rxjs";
import {SampleInfo} from "./sample-info.component";
import {environment} from "../../../environments/environment";
import {CommonService} from "../common.service";



@Injectable({
  providedIn: 'root'
})
export class SampleInfoService {

  constructor(private commonService: CommonService,
              private http: HttpClient) {}



  // updateSampleInfo(sampleInfo: any): Observable<any> {
  //   let httpOptions = {
  //     headers: new HttpHeaders({
  //       'Content-Type': 'application/json'
  //     })
  //   };
  //   console.log('what does sample info look like', sampleInfo)
  //   return this.http.post<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/updatesampleinfo/', JSON.stringify(sampleInfo), httpOptions)
  // }

}
