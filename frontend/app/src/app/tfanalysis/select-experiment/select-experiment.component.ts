import {AfterViewInit, Component, EventEmitter, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {SelectExperimentService} from './select-experiment.service';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {CommonService} from '../common.service';
import {ProcessingSettings, ProcessingSettingsComponent} from '../processing-settings/processing-settings.component';
import { Experiment } from '../common.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';


// TODO: add filters by project/data/etc?
// export interface Experiment {
//   id: number;
//   parser: string;
//   uploaded: string;
//   updated: string;
//   name: string;
//   project: string;
//   user: string;
//   notes: string;
//   parse_warnings: string;
//   expanded?: false;
// }

@Component({
  selector: 'app-select-experiment',
  templateUrl: './select-experiment.component.html',
  styleUrls: ['./select-experiment.component.css'],
  // animations: [
  //   trigger('detailExpand', [
  //     state('collapsed', style({height: '0px', minHeight: '0'})),
  //     state('expanded', style({height: '*'})),
  //     transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
  //   ]),
  // ],
})
export class SelectExperimentComponent implements AfterViewInit {
  displayedColumns: string[] = ['name', 'project', 'user', 'uploaded', 'select'];
  dataSource!: MatTableDataSource<Experiment>;
  selectedExperiment!: Experiment;
  experimentUpdateForm = new FormGroup({
    id: new FormControl(''), // Inaccessible to change, but guarantees uniqueness
    parser: new FormControl(''), // Inaccessible to change
    name: new FormControl(''),
    project: new FormControl(''),
    user: new FormControl(''), // Inaccessible to change
    notes: new FormControl(''),
    parse_warnings: new FormControl(''), // Inaccessible to change
  });
  instrumentInfo: any;
  parseWarnings: any;


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private selectExperimentService: SelectExperimentService,
              private commonService: CommonService) {
    commonService.experimentSelected$.subscribe(experiment => {
      this.selectedExperiment = experiment;
      this.setExperimentInfo();
      console.log('the type is', typeof(this.selectedExperiment.instrument_info));
    });
  }

  ngAfterViewInit(): void {
    // The reason for refreshing the info is because otherwise mat-table gets all bugged with open/closed expansion panels
    this.showExperiments();
  }

  selectExperiment(experiment: Experiment): void {
    this.commonService.selectExperiment(experiment);
    // TODO: remove this convenience function eventually. It is only meant to auto-load on click. which should be built-in
    // this.commonService.fetchProcessedData();
  }

  showExperiments(): void {
    this.selectExperimentService.fetchExperiments()
      .subscribe(data => {
        console.log(data);
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator;
        this.selectedExperiment = this.commonService.getSelectedExperiment();
        if (this.selectedExperiment) {
          this.setExperimentInfo();
        }
      });
  }

  applyAnyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  setExperimentInfo(): void {
    this.experimentUpdateForm.get('name').setValue(this.selectedExperiment.name);
    this.experimentUpdateForm.get('project').setValue(this.selectedExperiment.project);
    this.experimentUpdateForm.get('notes').setValue(this.selectedExperiment.notes);
    this.instrumentInfo = JSON.parse(this.selectedExperiment.instrument_info);
    this.parseWarnings = JSON.parse(this.selectedExperiment.parse_warnings);
    console.log('this is what instrument info looks like after parsing', this.instrumentInfo);
  }

  updateExperimentInfo(): void {

  }
}

