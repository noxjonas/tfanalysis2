import { Injectable } from '@angular/core';
import { EventEmitter } from '@angular/core';
import {Observable} from 'rxjs';
import {TransitionProcessingSettings} from './processing-settings/processing-settings.component';
import {environment} from '../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {SampleInfo} from './sample-info/sample-info.component';
import {sample} from 'rxjs/operators';
import {Form, FormGroup} from '@angular/forms';
import {PeakFindingSettings, PeakFindingSettingsComponent} from './transition-view/peak-finding-settings/peak-finding-settings.component';
import {MatDialog} from '@angular/material/dialog';
import {StandardErrorDialogComponent} from './error-dialogs/standard-error-dialog/standard-error-dialog.component';


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
  autoprocess: boolean;
  expanded?: false; // TODO: not implemented, remove?
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

  x: number[];
  y: number[];
  index: number[];
  [key: string]: any;
}


@Injectable({
  providedIn: 'root'
})
export class CommonService {

  public parsers: Parsers[];
  public dataImportSuccess$: EventEmitter<boolean>;

  public experiments: Experiment[];
  public selectedExperiment: Experiment;
  public experimentSelected$: EventEmitter<Experiment>;

  public sampleInfo: SampleInfo[];
  public sampleInfoChanged$: EventEmitter<SampleInfo[]>;

  public transitionProcessingSettingsForm: FormGroup;
  public transitionProcessingSettings: TransitionProcessingSettings;
  public transitionPreviewData: TransitionData[];


  public transitionsProcessingStarted$: EventEmitter<boolean>;
  public transitionsProcessed$: EventEmitter<boolean>;
  public transitionData!: TransitionData[];


  public peakData!: PeakData[];
  public peakFindingSettingsForm: FormGroup;
  public peakFindingSettings: PeakFindingSettings;

  public peakFindingStarted$: EventEmitter<boolean>;
  public peakFindingComplete$: EventEmitter<boolean>;


  constructor(
    private http: HttpClient,
    public standardErrorDialog: MatDialog,
  ) {
    this.dataImportSuccess$ = new EventEmitter();
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

  callAutoProcess(): void {
    if (!this.selectedExperiment) {
      return;
    }

    // TODO: currently taken from database; but perhaps this is a mistake? instead this could be entirely controlled in frontend
    if (!this.selectedExperiment.autoprocess) {
      // Just import the settings if autoprocessing is off
      this.fetchSampleInfo();
      this.fetchTransitionProcessingSettings();
      this.fetchPeakFindingSettings();
      return;
    }

    // TODO: generalise the loading events and perhaps shorten this...
    this.transitionsProcessingStarted$.emit(true);
    this.http.post<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/fetchsampleinfo/',
      JSON.stringify({id: this.selectedExperiment.id}),
      this.jsonHttpOptions).subscribe(sampleInfo => {
      this.sampleInfo = sampleInfo;
      this.sampleInfoChanged$.emit(sampleInfo);

      this.http.post<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/fetchtransitionprocessingsettings/',
        JSON.stringify({id: this.selectedExperiment.id}),
        this.jsonHttpOptions).subscribe(transitionProcessingSettings => {
        this.transitionProcessingSettings = transitionProcessingSettings;

        this.http.post<TransitionData[]>(environment.baseApiUrl + 'tfanalysis/processtransitiondata/',
          JSON.stringify({id: this.selectedExperiment.id}),
          this.jsonHttpOptions).subscribe(transitionData => {
          this.transitionData = transitionData;
          this.transitionsProcessed$.emit(true);
          this.peakFindingStarted$.emit(true);

          this.http.post<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/fetchpeakfindingsettings/',
            JSON.stringify({id: this.selectedExperiment.id}),
            this.jsonHttpOptions).subscribe(peakFindingSettings => {
            this.peakFindingSettings = peakFindingSettings;

            this.http.post<PeakData[]>(environment.baseApiUrl + 'tfanalysis/findpeaks/',
              JSON.stringify({id: this.selectedExperiment.id}),
              this.jsonHttpOptions).subscribe(peakData => {
              this.peakData = peakData;
              this.peakFindingComplete$.emit(true);

              // END

              }, error => {
                this.peakFindingComplete$.emit(true);
                this.displayErrorDialog('', error);
              });
            }, error => {
              this.displayErrorDialog('', error);
            });
          }, error => {
            this.transitionsProcessed$.emit(true);
            this.displayErrorDialog('', error);
          });
        }, error => {
        this.displayErrorDialog('', error);
      });
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  displayErrorDialog(_CALLER: string, _ERROR: any, _WIDTH?: string): void {
    const dialogRef = this.standardErrorDialog.open(StandardErrorDialogComponent, {
      data: {caller: _CALLER, errorContent: _ERROR},
      width: _WIDTH ? _WIDTH : '800px',
    });
    dialogRef.afterClosed().subscribe(result => {
    });
  }

  fetchParsers(): void {
    this.http.get<Parsers[]>(environment.baseApiUrl + 'tfanalysis/fetchparsers/').subscribe(
      data => {
        this.parsers = data;
      }, error => {
        this.displayErrorDialog('', error);
      });
  }

  uploadDataFiles(fileUploadForm: FormGroup): void {
    const formData = new FormData();
    for (const control of Object.keys(fileUploadForm.controls)) {
      if (control === 'files') {
        for (const file of fileUploadForm.value[control]) {
          formData.append(control, file, file.name);
        }
      } else {
        formData.append(control, fileUploadForm.value[control]);
      }
    }
    this.http.post<Experiment>(environment.baseApiUrl + 'tfanalysis/uploaddata/', formData).subscribe(experiment => {
      this.http.post<Experiment[]>(environment.baseApiUrl + 'tfanalysis/fetchexperiments/', null).subscribe(experiments => {
        this.experiments = experiments;
        this.selectExperiment(experiment);
        this.dataImportSuccess$.emit(true);
      }, error => {
        this.displayErrorDialog('', error);
      });
    }, error => {
      this.displayErrorDialog('uploaddata', error);
    });
  }

  fetchExperiments(): void {
    this.http.post<Experiment[]>(environment.baseApiUrl + 'tfanalysis/fetchexperiments/', null).subscribe(experiments => {
      this.experiments = experiments;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  selectExperiment(experiment: Experiment): void {
    this.selectedExperiment = experiment;
    this.experimentSelected$.emit(experiment);
    this.callAutoProcess();
  }

  updateExperimentInfo(formGroupRaw: string): void {
    this.http.put<any>(
      environment.baseApiUrl + 'tfanalysis/updateexperimentinfo/',
      JSON.stringify(formGroupRaw),
      this.jsonHttpOptions).subscribe(experiment => {
        this.selectedExperiment = experiment;
        this.fetchExperiments();
      }, error => {
          this.displayErrorDialog('', error);
        });
  }

  deleteExperiment(experiment: Experiment): void {
    this.http.post<any>(environment.baseApiUrl + 'tfanalysis/deleteexperiment/',
      JSON.stringify({id: experiment.id}),
      this.jsonHttpOptions).subscribe(data => {
        this.selectedExperiment = null;
        this.fetchExperiments();
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  fetchSampleInfo(): void {
    this.http.post<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/fetchsampleinfo/',
      JSON.stringify({id: this.selectedExperiment.id}),
      this.jsonHttpOptions).subscribe(sampleInfo => {
        this.sampleInfo = sampleInfo;
        // TODO: get rid of this?
        this.sampleInfoChanged$.emit(sampleInfo);
      }, error => {
      this.displayErrorDialog('', error);
    });
  }

  public updateSampleInfo(newSampleInfo: any): void {
    this.http.put<SampleInfo[]>(environment.baseApiUrl + 'tfanalysis/updatesampleinfo/',
      JSON.stringify(newSampleInfo),
      this.jsonHttpOptions).subscribe( sampleInfo => {
        this.sampleInfoChanged$.emit(sampleInfo);
        this.sampleInfo = sampleInfo;
      }, error => {
        this.displayErrorDialog('', error);
      });
  }

  fetchTransitionProcessingSettings(): void {
    this.http.post<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/fetchtransitionprocessingsettings/',
      JSON.stringify({id: this.selectedExperiment.id}),
      this.jsonHttpOptions).subscribe(transitionProcessingSettings => {
        this.transitionProcessingSettings = transitionProcessingSettings;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  // Not used
  updateTransitionProcessingSettings(): void {
    this.http.put<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/updatetransitionprocessingsettings/',
      JSON.stringify(this.transitionProcessingSettingsForm.getRawValue()),
      this.jsonHttpOptions).subscribe(transitionProcessingSettings => {
        this.transitionProcessingSettings = transitionProcessingSettings;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  resetTransitionProcessingSettings(): void {
    this.http.post<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/resettransitionprocessingsettings/',
      JSON.stringify({id: this.selectedExperiment.id}),
      this.jsonHttpOptions).subscribe(transitionProcessingSettings => {
      this.transitionProcessingSettings = transitionProcessingSettings;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  postPreviewTransitionProcessing(filterPos: string[]): void {
    this.http.put<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/updatetransitionprocessingsettings/',
      JSON.stringify(this.transitionProcessingSettingsForm.getRawValue()),
      this.jsonHttpOptions).subscribe(transitionProcessingSettings => {
        this.transitionProcessingSettings = transitionProcessingSettings;
        this.http.post<TransitionData[]>(environment.baseApiUrl + 'tfanalysis/previewtransitionprocessing/',
          JSON.stringify({id: this.selectedExperiment.id, filter: filterPos}),
          this.jsonHttpOptions).subscribe(transitionPreviewData => {
            this.transitionPreviewData = transitionPreviewData;
        }, error => {
          this.displayErrorDialog('', error);
      });
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  fetchProcessedTransitionData(): void {
    this.transitionsProcessingStarted$.emit(true);
    this.http.put<TransitionProcessingSettings>(environment.baseApiUrl + 'tfanalysis/updatetransitionprocessingsettings/',
      JSON.stringify(this.transitionProcessingSettingsForm.getRawValue()),
      this.jsonHttpOptions).subscribe(transitionProcessingSettings => {
      this.transitionProcessingSettings = transitionProcessingSettings;
      this.http.post<TransitionData[]>(environment.baseApiUrl + 'tfanalysis/processtransitiondata/',
        JSON.stringify({id: this.selectedExperiment.id}),
        this.jsonHttpOptions).subscribe(transitionData => {
        this.transitionData = transitionData;
        this.transitionsProcessed$.emit(true);
      }, error => {
        this.transitionsProcessed$.emit(true);
        this.displayErrorDialog('', error);
      });
    }, error => {
      this.transitionsProcessed$.emit(true);
      this.displayErrorDialog('', error);
    });
  }

  fetchPeakFindingSettings(): void {
    this.http.post<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/fetchpeakfindingsettings/',
      JSON.stringify({id: this.selectedExperiment.id}),
      this.jsonHttpOptions).subscribe(peakFindingSettings => {
      this.peakFindingSettings = peakFindingSettings;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  // Not used
  updatePeakFindingSettings(): void {
    this.http.put<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/updatepeakfindingsettings/',
      JSON.stringify(this.peakFindingSettingsForm.getRawValue()),
      this.jsonHttpOptions).subscribe(peakFindingSettings => {
      this.peakFindingSettings = peakFindingSettings;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  resetPeakFindingSettings(): void {
    this.http.post<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/resetpeakfindingsettings/',
      JSON.stringify({id: this.selectedExperiment.id}),
      this.jsonHttpOptions).subscribe(peakFindingSettings => {
      this.peakFindingSettings = peakFindingSettings;
    }, error => {
      this.displayErrorDialog('', error);
    });
  }

  fetchPeakData(): void {
    this.peakData = [];
    this.peakFindingStarted$.emit(true);
    this.http.put<PeakFindingSettings>(environment.baseApiUrl + 'tfanalysis/updatepeakfindingsettings/',
      JSON.stringify(this.peakFindingSettingsForm.getRawValue()),
      this.jsonHttpOptions).subscribe(peakFindingSettings => {
      this.peakFindingSettings = peakFindingSettings;
      this.http.post<PeakData[]>(environment.baseApiUrl + 'tfanalysis/findpeaks/',
        JSON.stringify({id: this.selectedExperiment.id}),
        this.jsonHttpOptions).subscribe(peakData => {
        this.peakData = peakData;
        this.peakFindingComplete$.emit(true);
      }, error => {
        this.peakFindingComplete$.emit(true);
        this.displayErrorDialog('', error);
      });
    }, error => {
      this.peakFindingComplete$.emit(true);
      this.displayErrorDialog('', error);
    });
  }



}
