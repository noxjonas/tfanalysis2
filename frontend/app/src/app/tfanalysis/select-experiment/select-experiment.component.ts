import {AfterViewInit, Component, EventEmitter, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {SelectExperimentService} from "./select-experiment.service";
import {animate, state, style, transition, trigger} from '@angular/animations';
import {CommonService} from "../common.service";
import {SelectedExperiment} from "../common.service";
import {ProcessingSettings, ProcessingSettingsComponent} from "../processing-settings/processing-settings.component";

export interface Experiment {
  id: number;
  name: string;
  uploaded: string;
  user: string;
  notes: string;
  errors: string;
  expanded: false;
}

@Component({
  selector: 'app-select-experiment',
  templateUrl: './select-experiment.component.html',
  styleUrls: ['./select-experiment.component.css'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class SelectExperimentComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'name', 'uploaded', 'user'];
  dataSource!: MatTableDataSource<Experiment>;
  selectedExperiment!: SelectedExperiment;


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private selectExperimentService: SelectExperimentService,
              private commonService: CommonService) {
    commonService.experimentSelected$.subscribe(experiment => this.selectedExperiment = experiment);
  }

  ngAfterViewInit() {
    this.showExperiments();
  }

  selectExperiment(experiment: Experiment) {
    console.log('You are picking experiment', experiment);
    this.commonService.selectExperiment(experiment);
    this.commonService.fetchProcessedData()
  }

  showExperiments() {
    this.selectExperimentService.fetchExperiments()
      .subscribe(data => {
        console.log(data)
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator;
        this.selectedExperiment = this.commonService.getSelectedExperiment()
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}

