import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CommonService } from '../common.service';
import { Experiment } from '../common.service';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DeleteConfirmDialogComponent } from './delete-confirm-dialog.component';

@Component({
  selector: 'app-select-experiment',
  templateUrl: './select-experiment.component.html',
  styleUrls: ['./select-experiment.component.css'],
})

export class SelectExperimentComponent implements OnInit, OnChanges {
  @Input() selectedExperiment!: Experiment;
  @Input() experiments!: Experiment[];

  displayedColumns: string[] = ['name', 'project', 'user', 'updated', 'select'];
  dataSource!: MatTableDataSource<Experiment>;

  experimentUpdateForm = new FormGroup({
    id: new FormControl(''), // Cannot be changed, but guarantees uniqueness
    parser: new FormControl(''), // Cannot be changed
    name: new FormControl(''),
    project: new FormControl(''),
    user: new FormControl(''), // Cannot be changed
    notes: new FormControl(''),
    autoprocess: new FormControl(true),
  });
  instrumentInfo: any; // Parsed from JSON
  parseWarnings: any; // Parsed from JSON

  nameFilter = new FormControl();
  projectFilter = new FormControl();
  userFilter = new FormControl();
  globalFilter = '';

  filteredValues = {
    name: '', project: '', user: ''
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private commonService: CommonService,
    public deleteConfirmDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.commonService.fetchExperiments();

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.experiments) {
      this.dataSource = new MatTableDataSource(this.experiments);
      this.dataSource.paginator = this.paginator;
      this.dataSource.filterPredicate = this.customFilterPredicate();
      this.applyFilter(this.globalFilter);
    }
    if (changes.selectedExperiment && this.selectedExperiment) {
      this.setExperimentInfo();
    }
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

  setExperimentInfo(): void {
    // Could be a loop?
    this.experimentUpdateForm.get('id').setValue(this.selectedExperiment.id);
    this.experimentUpdateForm.get('parser').setValue(this.selectedExperiment.parser);
    this.experimentUpdateForm.get('name').setValue(this.selectedExperiment.name);
    this.experimentUpdateForm.get('project').setValue(this.selectedExperiment.project);
    this.experimentUpdateForm.get('user').setValue(this.selectedExperiment.user);
    this.experimentUpdateForm.get('notes').setValue(this.selectedExperiment.notes);
    this.experimentUpdateForm.get('autoprocess').setValue(this.selectedExperiment.autoprocess);
    this.instrumentInfo = JSON.parse(this.selectedExperiment.instrument_info);
    this.parseWarnings = JSON.parse(this.selectedExperiment.parse_warnings);
  }

  updateExperimentInfo(): void {
    this.commonService.updateExperimentInfo(this.experimentUpdateForm.getRawValue());
  }

  deleteExperiment(): void {
    const dialogRef = this.deleteConfirmDialog.open(DeleteConfirmDialogComponent, {
      width: '300px',
      data: this.selectedExperiment,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === this.selectedExperiment.id) {
        this.commonService.deleteExperiment(this.selectedExperiment);
      }
    });

  }
}

