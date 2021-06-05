import { Injectable } from '@angular/core';
import { EventEmitter } from '@angular/core';
import {Observable} from 'rxjs';
import {TransitionProcessingSettings} from './processing-settings/processing-settings.component';
import {environment} from '../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {SampleInfo} from './sample-info/sample-info.component';
import {sample} from 'rxjs/operators';
import {FormGroup} from '@angular/forms';
import {PeakFindingSettings} from './transition-view/peak-finding-settings/peak-finding-settings.component';


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
  id?: number;
  experiment?: number;
  processing_settings?: number;
  raw_data?: number;

  pos: string;

  raw_x: number[];
  raw_y: number[];
  regular_x: number[];
  regular_y: number[];
  normal_y: number[];
  smooth_y: number[];
  first_der_y: number[];
  [key: string]: any;
}

export interface PeakData {
  id?: number;
  experiment?: number;
  processing_settings?: number;
  transition_data?: number;

  pos: string;

  peaks_x: number[];
  peaks_y: number[];
  peaks_index: number[];
  [key: string]: any;
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

  public peakData!: PeakData[];
  public peakFindingStarted$: EventEmitter<boolean>;
  public peakFindingComplete$: EventEmitter<boolean>;

  constructor(private http: HttpClient) {
    this.parsersReceived$ = new EventEmitter();
    this.experimentSelected$ = new EventEmitter();
    this.transitionsProcessingStarted$ = new EventEmitter();
    this.transitionsProcessed$ = new EventEmitter();
    this.sampleInfoChanged$ = new EventEmitter();

    this.peakFindingStarted$ = new EventEmitter();
    this.peakFindingComplete$ = new EventEmitter();
  }

  jsonHttpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

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

  public selectExperiment(experiment: any): Experiment {
    this.selected = experiment;
    console.log('There is something wrong with selected experiment', this.selected);
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
    return this.http.put<any>(environment.baseApiUrl + 'tfanalysis/updateexperimentinfo/', JSON.stringify(formGroupRaw), this.jsonHttpOptions);
  }

  deleteExperiment(experimentId: number): Observable<any> {
    return this.http.post<any>(environment.baseApiUrl + 'tfanalysis/deleteexperiment/', JSON.stringify({id: experimentId}), this.jsonHttpOptions);
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
  public postSampleInfo(sampleInfo: any): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    console.log('what does sample info look like', sampleInfo);
    this.sampleInfoChanged$.emit(sampleInfo);
    this.sampleInfoData = sampleInfo;
    return this.http.put<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/updatesampleinfo/', JSON.stringify(sampleInfo), this.jsonHttpOptions);
  }

  fetchTransitionProcessingSettings(): Observable<TransitionProcessingSettings> {
    return this.http.post<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/fetchtransitionprocessingsettings/', JSON.stringify({id: this.selected.id}), this.jsonHttpOptions);
  }
  updateTransitionProcessingSettings(formGroupRaw: string): Observable<any> {
    return this.http.put<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/updatetransitionprocessingsettings/', JSON.stringify(formGroupRaw), this.jsonHttpOptions);
  }
  resetTransitionProcessingSettings(): Observable<any> {
    return this.http.post<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/resettransitionprocessingsettings/', JSON.stringify({id: this.selected.id}), this.jsonHttpOptions);
  }

  postPreviewTransitionProcessing(filterPos: string[]): Observable<TransitionData[]> {
    return this.http.post<TransitionData[]>(environment.baseApiUrl + 'tfanalysis/previewtransitionprocessing/', JSON.stringify({id: this.selected.id, filter: filterPos}), this.jsonHttpOptions);
  }


  private postProcessTransitionData(): Observable<TransitionData[]> {
    this.transitionsProcessingStarted$.emit(true);
    return this.http.post<TransitionData[]>(environment.baseApiUrl + 'tfanalysis/processtransitiondata/', JSON.stringify({id: this.selected.id}), this.jsonHttpOptions);
  }

  public fetchProcessedTransitionData(): void {
    this.postProcessTransitionData().subscribe(
      data => {
        this.transitionData = data;
        this.transitionsProcessed$.emit(true);
      }, error => {
        // TODO: implement error dialog
        console.log('Processing of all transitions failed');
        this.transitionsProcessed$.emit(true);
      }
    );
  }

  fetchPeakFindingSettings(): Observable<PeakFindingSettings> {
    return this.http.post<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/fetchpeakfindingsettings/', JSON.stringify({id: this.selected.id}), this.jsonHttpOptions);
  }
  updatePeakFindingSettings(formGroupRaw: string): Observable<any> {
    return this.http.put<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/updatepeakfindingsettings/', JSON.stringify(formGroupRaw), this.jsonHttpOptions);
  }
  resetPeakFindingSettings(): Observable<any> {
    return this.http.post<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/resetpeakfindingsettings/', JSON.stringify({id: this.selected.id}), this.jsonHttpOptions);
  }

  private postFindPeaks(): Observable<PeakData[]> {
    this.peakFindingStarted$.emit(true);
    return this.http.post<PeakData[]>(environment.baseApiUrl + 'tfanalysis/findpeaks/', JSON.stringify({id: this.selected.id}), this.jsonHttpOptions);
  }

  public fetchPeakData(): void {
    this.postFindPeaks().subscribe(
      data => {
        this.peakData = data;
        this.peakFindingComplete$.emit(true);
      }, error => {
        // TODO: implement error dialog
        console.log('Peak finding failed');
        this.peakFindingComplete$.emit(true);
      }
    );
  }



}
