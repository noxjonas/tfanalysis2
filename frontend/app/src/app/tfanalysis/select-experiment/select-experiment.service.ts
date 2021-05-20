import { Injectable } from '@angular/core';
import { HttpClient } from  '@angular/common/http';
import { environment } from '../../../environments/environment'
import { Observable } from 'rxjs';

import { Experiment } from "./select-experiment.component";

@Injectable({
  providedIn: 'root'
})
export class SelectExperimentService {

  constructor(private http: HttpClient) { }

  fetchExperiments(): Observable<any> {
    return this.http.post<Experiment[]>(environment.baseApiUrl+'tfanalysis/fetchexperiments/', null)
  }
}
