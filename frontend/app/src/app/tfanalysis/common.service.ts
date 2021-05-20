import { Injectable } from '@angular/core';
import {EventEmitter} from "@angular/core";
import {Observable} from "rxjs";
import {ProcessingSettings} from "./processing-settings/processing-settings.component";
import {environment} from "../../environments/environment";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {SampleInfo} from "./sample-info/sample-info.component";
import {sample} from "rxjs/operators";


export class SelectedExperiment {
  constructor(
    public id: number,
    public name: string,
    public uploaded: string,
    public user: string,
    public notes: string,
    public errors: string,
  ) {}
}

export interface TransitionData {
  experiment: number,
  processing_info: number,
  raw_data: number,
  pos: string,
  scatter_raw_x: number[],
  scatter_raw_y: number[],
  scatter_regular_x: number[],
  scatter_regular_y: number[],
  scatter_normal_y: number[],
  scatter_smooth_y: number[],
  scatter_first_der_y: number[],
  all_peaks: number[],
  top_peak: number,
  [key: string]: any;
}

export class TransitionData {
  constructor(
    public experiment: number,
    public processing_info: number,
    public raw_data: number,
    public pos: string,
    public scatter_raw_x: number[],
    public scatter_raw_y: number[],
    public scatter_regular_x: number[],
    public scatter_regular_y: number[],
    public scatter_normal_y: number[],
    public scatter_smooth_y: number[],
    public scatter_first_der_y: number[],
    public all_peaks: number[],
    public top_peak: number,

  ) {}
}

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  public experimentSelected$: EventEmitter<SelectedExperiment>;
  public selected!: SelectedExperiment;
  public transitionsProcessed$: EventEmitter<boolean>;
  public transitionData!: TransitionData[];
  public sampleInfoChanged$: EventEmitter<SampleInfo[]>;
  public sampleInfoData!: SampleInfo[];

  constructor(private http: HttpClient) {
    this.experimentSelected$ = new EventEmitter();
    this.transitionsProcessed$ = new EventEmitter();
    this.sampleInfoChanged$ = new EventEmitter();
  }

  public selectExperiment(experiment: SelectedExperiment): SelectedExperiment {
    this.selected = experiment;
    this.experimentSelected$.emit(experiment);
    return this.selected
  }

  public getSelectedExperiment() {
    return this.selected;
  }

  // Need to fix implementation on this, as it should just take data if settings weren't changed?
  // Perhaps post settings and if they haven't changed api will just return already existing processed data
  private postProcessData() : Observable<any> {
    const formData = new FormData()
    formData.append('experiment_id', String(this.selected.id))
    return this.http.post<any>(environment.baseApiUrl + 'tfanalysis/processdata/', formData)
  }

  public fetchProcessedData() {
    this.postProcessData().subscribe(
      data => {
        this.transitionData = data
        this.transitionsProcessed$.emit(true);
      }
    )
  }

  public postSampleInfo(sampleInfo: any): Observable<any> {
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    console.log('what does sample info look like', sampleInfo)
    this.sampleInfoChanged$.emit(sampleInfo);
    this.sampleInfoData = sampleInfo;
    return this.http.put<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/updatesampleinfo/', JSON.stringify(sampleInfo), httpOptions)
  }

  _fetchSampleInfo(): Observable<any> {
    const selectedExperiment = this.getSelectedExperiment();
    const formData = new FormData()
    formData.append('experiment_id', String(selectedExperiment.id))
    return this.http.post<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/fetchsampleinfo/', formData)
  }
  public fetchSampleInfo() {
    this._fetchSampleInfo()
      .subscribe(data => {
        this.sampleInfoData = data
        //this.commonService.shareSampleInfo(data)
        this.sampleInfoChanged$.emit(data);
      });
  }
  // public shareSampleInfo(sampleInfo: any) {
  //   this.sampleInfoChanged$.emit(sampleInfo);
  // }

}
