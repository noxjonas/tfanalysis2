import { Injectable } from '@angular/core';
import { EventEmitter } from '@angular/core';
import {Observable} from 'rxjs';
import {ProcessingSettings} from './processing-settings/processing-settings.component';
import {environment} from '../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {SampleInfo} from './sample-info/sample-info.component';
import {sample} from 'rxjs/operators';
import {FormGroup} from '@angular/forms';


export interface Parsers {
  python_class_name: string;
  name: string;
  info: string;
  accepted_file_types: string[];
  available_data_types: string[];
  allow_data_merge: boolean;
}

export interface Experiment {
  id: number;
  parser: string;
  uploaded: string;
  updated: string;
  name: string;
  project: string;
  user: string;
  notes: string;
  instrument_info?: string;
  parse_warnings?: string;
  expanded?: false;
}

export interface TransitionData {
  experiment: number;
  processing_info: number;
  raw_data: number;
  pos: string;
  scatter_raw_x: number[];
  scatter_raw_y: number[];
  scatter_regular_x: number[];
  scatter_regular_y: number[];
  scatter_normal_y: number[];
  scatter_smooth_y: number[];
  scatter_first_der_y: number[];
  all_peaks: number[];
  top_peak: number;
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
  public parsersReceived$: EventEmitter<boolean>;
  public experimentSelected$: EventEmitter<Experiment>;
  public experiments: Experiment[];
  public selected!: Experiment;
  public transitionsProcessingStarted$: EventEmitter<boolean>;
  public transitionsProcessed$: EventEmitter<boolean>;
  public transitionData!: TransitionData[];
  public sampleInfoChanged$: EventEmitter<SampleInfo[]>;
  public sampleInfoData!: SampleInfo[];
  public parsers!: Parsers[];

  constructor(private http: HttpClient) {
    this.parsersReceived$ = new EventEmitter();
    this.experimentSelected$ = new EventEmitter();
    this.transitionsProcessingStarted$ = new EventEmitter();
    this.transitionsProcessed$ = new EventEmitter();
    this.sampleInfoChanged$ = new EventEmitter();
  }

  private _fetchParsers(): Observable<any> {
    return this.http.get<Parsers[]>(environment.baseApiUrl + 'tfanalysis/fetchparsers/');
  }

  public fetchParsers(): void {
    this._fetchParsers().subscribe(
      data => {
        this.parsers = data;
        this.parsersReceived$.emit(null);
        return;
      }
    );
  }

  fetchExperiments(): Observable<Experiment[]> {
    return this.http.post<Experiment[]>(environment.baseApiUrl + 'tfanalysis/fetchexperiments/', null);
  }

  public selectExperiment(experiment: any) {
    this.selected = experiment;
    this.experimentSelected$.emit(experiment);
    return this.selected;
  }

  public getSelectedExperiment(): Experiment {
    return this.selected;
  }

  updateExperimentInfo(formGroupRaw: string): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return this.http.put<any>(environment.baseApiUrl + 'tfanalysis/updateexperimentinfo/', JSON.stringify(formGroupRaw), httpOptions);
  }

  deleteExperiment(experimentId: number): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return this.http.post<any>(environment.baseApiUrl + 'tfanalysis/deleteexperiment/', JSON.stringify({id: experimentId}), httpOptions);
  }

  // Need to fix implementation on this, as it should just take data if settings weren't changed?
  // Perhaps post settings and if they haven't changed api will just return already existing processed data
  private postProcessData(): Observable<any> {
    this.transitionsProcessingStarted$.emit();
    const formData = new FormData();
    formData.append('experiment_id', String(this.selected.id));
    return this.http.post<any>(environment.baseApiUrl + 'tfanalysis/processdata/', formData);
  }

  public fetchProcessedData(): void {
    this.postProcessData().subscribe(
      data => {
        this.transitionData = data;
        this.transitionsProcessed$.emit(true);
      }
    );
  }

  public postSampleInfo(sampleInfo: any): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    console.log('what does sample info look like', sampleInfo);
    this.sampleInfoChanged$.emit(sampleInfo);
    this.sampleInfoData = sampleInfo;
    return this.http.put<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/updatesampleinfo/', JSON.stringify(sampleInfo), httpOptions);
  }

  private _fetchSampleInfo(): Observable<any> {
    const selectedExperiment = this.getSelectedExperiment();
    const formData = new FormData();
    formData.append('experiment_id', String(selectedExperiment.id));
    return this.http.post<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/fetchsampleinfo/', formData);
  }
  public fetchSampleInfo(): void {
    this._fetchSampleInfo()
      .subscribe(data => {
        this.sampleInfoData = data;
        // this.commonService.shareSampleInfo(data)
        this.sampleInfoChanged$.emit(data);
      });
  }
  // public shareSampleInfo(sampleInfo: any) {
  //   this.sampleInfoChanged$.emit(sampleInfo);
  // }

}
