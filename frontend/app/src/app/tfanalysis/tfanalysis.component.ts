import {Component, ElementRef, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {Clipboard} from "@angular/cdk/clipboard";

@Component({
  selector: 'app-tfanalysis',
  templateUrl: './tfanalysis.component.html',
  styleUrls: ['./tfanalysis.component.css']
})
export class TfanalysisComponent implements AfterViewInit {

  constructor(private clipboard: Clipboard) { }

  ngAfterViewInit(): void {
  }

  getPath() {
    this.clipboard.copy("C:\\projects\\opencoot.bat")
  }
}
