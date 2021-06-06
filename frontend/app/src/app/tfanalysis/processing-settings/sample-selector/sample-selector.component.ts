import {Component, ElementRef, EventEmitter, Input, OnChanges, SimpleChanges, Output, ViewChild} from '@angular/core';
import {MatAutocomplete, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatChipInputEvent} from '@angular/material/chips';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {SampleInfo} from '../../sample-info/sample-info.component';

// TODO: add randomize button
// TODO: autocomplete should not have to start with

@Component({
  selector: 'app-sample-selector',
  templateUrl: './sample-selector.component.html',
  styleUrls: ['./sample-selector.component.css']
})
export class SampleSelectorComponent implements OnChanges {
  @Input() sampleInfo!: SampleInfo[];

  @Output() filterPos = new EventEmitter<string[]>();

  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  positionCtrl = new FormControl();
  filteredPositions: Observable<string[]>;
  positions: string[] = [];
  allPositions: string[] = [];

  @ViewChild('positionInput', {static: false}) positionInput: ElementRef<HTMLInputElement>;
  @ViewChild('auto', {static: false}) matAutocomplete: MatAutocomplete;

  constructor() {
    this.filteredPositions = this.positionCtrl.valueChanges.pipe(
      map((position: string | null) => position ? this._filter(position) : this.allPositions.slice())
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.sampleInfo && this.sampleInfo) {
      // Set options
      this.allPositions = this.sampleInfo.map(x => x.pos);
    }
  }

  add(event: MatChipInputEvent): void {
    // Add position only when MatAutocomplete is not open
    // To make sure this does not conflict with OptionSelected Event
    if (!this.matAutocomplete.isOpen) {
      const input = event.input;
      const value = event.value;

      // Add position to filter
      if ((value || '').trim() && this.positions.length < 3) {
        this.positions.push(value.trim());
      }

      // Reset the input value
      if (input) {
        input.value = '';
      }

      this.filterPos.emit(this.positions);

      this.positionCtrl.setValue(null);
    }
  }

  remove(position: string): void {
    const index = this.positions.indexOf(position);

    if (index >= 0) {
      this.positions.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    if (this.positions.length < 3) {
      this.positions.push(event.option.viewValue);
      this.positionInput.nativeElement.value = '';
      this.positionCtrl.setValue(null);
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allPositions.filter(position => position.toLowerCase().indexOf(filterValue) === 0);
  }

  randomThree(): void {
    const pickRandom = (ARRAY: string[], count: number) => {
      const arr = [...ARRAY];
      return[...Array(count)].map( () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
    };

    if (this.allPositions.length > 2) {
      this.positions = pickRandom(this.allPositions, 3);
    } else {
      this.positions = pickRandom(this.allPositions, this.allPositions.length);
    }

    this.filterPos.emit(this.positions);
  }

}
