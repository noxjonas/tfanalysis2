import {AfterViewInit, Component, EventEmitter, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {SelectExperimentService} from './select-experiment.service';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {CommonService} from '../common.service';
import {TransitionProcessingSettings, ProcessingSettingsComponent} from '../processing-settings/processing-settings.component';
import { Experiment } from '../common.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {UploadErrorDialogComponent} from '../file-upload/upload-error-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {DeleteConfirmDialogComponent} from './delete-confirm-dialog.component';

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
export class SelectExperimentComponent implements OnInit {
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
  });
  instrumentInfo: any;
  parseWarnings: any;

  nameFilter = new FormControl();
  projectFilter = new FormControl();
  userFilter = new FormControl();
  globalFilter = '';

  filteredValues = {
    name: '', project: '', user: ''
  };


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private selectExperimentService: SelectExperimentService,
              private commonService: CommonService,
              public deleteConfirmDialog: MatDialog) {
    commonService.experimentSelected$.subscribe(experiment => {
      this.selectedExperiment = experiment;
      this.showExperiments();
    });
  }

  ngOnInit(): void {
    // The reason for refreshing the info is because otherwise mat-table gets all bugged with open/closed expansion panels
    this.showExperiments();

    this.nameFilter.valueChanges.subscribe((nameFilterValue) => {
      this.filteredValues.name = nameFilterValue;
      this.dataSource.filter = JSON.stringify(this.filteredValues);
    });
    this.projectFilter.valueChanges.subscribe((projectFilterValue) => {
      this.filteredValues.project = projectFilterValue;
      this.dataSource.filter = JSON.stringify(this.filteredValues);

    });
    this.userFilter.valueChanges.subscribe((userFilterValue) => {
      this.filteredValues.user = userFilterValue;
      this.dataSource.filter = JSON.stringify(this.filteredValues);
    });
  }

  applyFilter(filter: any): void {
    this.globalFilter = filter;
    this.dataSource.filter = JSON.stringify(this.filteredValues);
  }

  customFilterPredicate(): any {
    const myFilterPredicate = (data: Experiment, filter: string): boolean => {
      let globalMatch = !this.globalFilter;

      if (this.globalFilter) {
        // search all text fields
        globalMatch = data.name.toString().trim().toLowerCase().indexOf(this.globalFilter.toLowerCase()) !== -1 ||
          data.project.toString().trim().toLowerCase().indexOf(this.globalFilter.toLowerCase()) !== -1 ||
        data.user.toString().trim().toLowerCase().indexOf(this.globalFilter.toLowerCase()) !== -1 ||
        data.instrument_info.toString().trim().toLowerCase().indexOf(this.globalFilter.toLowerCase()) !== -1 ||
        data.notes.toString().trim().toLowerCase().indexOf(this.globalFilter.toLowerCase()) !== -1;
      }

      if (!globalMatch) {
        return null;
      }

      const searchString = JSON.parse(filter);
      return data.name.toString().trim().indexOf(searchString.name) !== -1 &&
        data.project.toString().trim().toLowerCase().indexOf(searchString.project.toLowerCase()) !== -1 &&
        data.user.toString().trim().toLowerCase().indexOf(searchString.user.toLowerCase()) !== -1;
    };
    return myFilterPredicate;
  }

  selectExperiment(experiment: Experiment): void {
    this.commonService.selectExperiment(experiment);
  }

  showExperiments(update?: boolean): void {
    this.commonService.fetchExperiments()
      .subscribe(data => {
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.filterPredicate = this.customFilterPredicate();
        this.selectedExperiment = this.commonService.getSelectedExperiment();
        if (this.selectedExperiment && !update) {
          this.setExperimentInfo();
        }
      });
  }

  setExperimentInfo(): void {
    this.experimentUpdateForm.get('id').setValue(this.selectedExperiment.id);
    this.experimentUpdateForm.get('parser').setValue(this.selectedExperiment.parser);
    this.experimentUpdateForm.get('name').setValue(this.selectedExperiment.name);
    this.experimentUpdateForm.get('project').setValue(this.selectedExperiment.project);
    this.experimentUpdateForm.get('user').setValue(this.selectedExperiment.user);
    this.experimentUpdateForm.get('notes').setValue(this.selectedExperiment.notes);
    this.instrumentInfo = JSON.parse(this.selectedExperiment.instrument_info);
    this.parseWarnings = JSON.parse(this.selectedExperiment.parse_warnings);
  }

  updateExperimentInfo(): void {
    this.commonService.updateExperimentInfo(this.experimentUpdateForm.getRawValue()).subscribe( data => {
      this.showExperiments(true);
    });
  }

  deleteExperiment(): void {

    const dialogRef = this.deleteConfirmDialog.open(DeleteConfirmDialogComponent, {
      width: '300px',
      data: this.selectedExperiment,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === this.selectedExperiment.id) {
        this.commonService.deleteExperiment(this.selectedExperiment.id).subscribe(data => {
          this.commonService.selectExperiment(null);
          this.showExperiments();
        });
      }
    });

  }
}

