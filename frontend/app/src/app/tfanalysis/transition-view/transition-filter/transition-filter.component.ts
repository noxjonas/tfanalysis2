import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import {SampleInfo} from "../../sample-info/sample-info.component";
import {FormControl, FormArray, FormGroup, FormBuilder, Form} from "@angular/forms";
import {TransitionViewService} from "../transition-view.service";
import {CommonService} from "../../common.service";

interface SampleColumnGroups {
  name: string;
  options: string[];
  formControl?: FormControl;
}

@Component({
  selector: 'app-transition-filter',
  templateUrl: './transition-filter.component.html',
  styleUrls: ['./transition-filter.component.css']
})
export class TransitionFilterComponent implements OnInit, OnChanges {
  filterOptions: SampleColumnGroups[] = [];
  filterPosArr: string[] = [];
  legitColumns = ['code', 'name', 'description', 'buffer', 'condition', 'concentration', 'unit', 'group'];
  protectBlanks = true;
  filterOutliers = true;
  invertFilter = false;
  //samples: SampleInfo[] = [];

  @Input() samples: SampleInfo[] = [];

  @Output() filtersChanged = new EventEmitter<string[]>();

  constructor(private transitionViewService: TransitionViewService,
              private commonService: CommonService,
              private _fb: FormBuilder
  ) {
    // commonService.sampleInfoChanged$.subscribe(data => this.ngOnInit());
    // commonService.sampleInfoChanged$.subscribe(data => {
    //   this.samples = data;
    //   this.makeFilters(data);
    // });
  }

  ngOnInit(): void {
    // this.makeFilters(this.samples);
    // this.filterSamples(null);
    // if (this.commonService.selected) {
    //   this.makeFilters(this.commonService.sampleInfoData)
    // }
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes.samples) {
      this.makeFilters(this.samples);
      this.filterSamples(null);
    }
  }

  filterSamples (event: any) {
    // This is reconstructed on each call
    this.filterPosArr = this.samples.map(x => x.pos)

    // Remove samples based on deselected property from specified column - if coming from dropdowns
    for (let column of this.filterOptions) {
      let deselectedSamples: string[] = [];
      this.samples.forEach(function(sample){
        if (!column.formControl.value.includes(sample[column.name])) {
          deselectedSamples.push(sample.pos)
        }
      })
      this.filterPosArr = this.filterPosArr.filter( x => !deselectedSamples.includes(x) );
    }
    // Invert the filtered items if needed; this needs to be done first since other two checkboxes are independent
    if (this.invertFilter) {
      // @ts-ignore
      this.filterPosArr = this.samples.flatMap(x => !this.filterPosArr.includes(x.pos) ? x.pos : []);
    }

    // Protect blanks if needed
    if (this.protectBlanks) {
      let blanks = this.samples.filter(x => x.blank)
      for (let blank of blanks) {
        this.filterPosArr.indexOf(blank.pos) === -1 ? this.filterPosArr.push(blank.pos) : null;
      }
    }

    // Remove manual outliers if needed
    if (this.filterOutliers) {
      let outliers = this.samples.filter(x => x.manual_outlier)
      for (let outlier of outliers) {
        this.filterPosArr.indexOf(outlier.pos) != -1 ? this.filterPosArr.splice(
          this.filterPosArr.indexOf(outlier.pos), 1
        ) : null;
      }
    }
    this.filterPosArr = this.filterPosArr.sort()
    this.filtersChanged.emit(this.filterPosArr);
  }

  makeFilters(data: SampleInfo[]) {
    this.filterOptions = [];
    // @ts-ignore
    const columnData = Object.fromEntries(Object.keys(data[0]).map(key => [key, data.map(o => o[key])]))
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
    for (let prop in columnData) {
      if (Object.prototype.hasOwnProperty.call(columnData, prop)) {
        if (this.legitColumns.includes(prop)) {
          // @ts-ignore
          let unique = [...new Set(columnData[prop])].sort(collator.compare);
          // push the 'other' values to the back -> it's renamed in template
          if (unique.includes("")) {
            unique.push(unique.splice(unique.indexOf(""), 1)[0]);
          }
          if (unique.length > 1) {
            this.filterOptions.push(<SampleColumnGroups>{
              name: prop,
              options: unique
            })
          }
        }
      }
    }
    for (let i = 0; i < this.filterOptions.length; i++) {
      this.filterOptions[i]['formControl'] = new FormControl(this.filterOptions[i]['options']);
    }
  }
}
