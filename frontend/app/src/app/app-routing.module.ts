import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TfanalysisComponent } from './tfanalysis/tfanalysis.component';


const routes: Routes = [
  { path: 'tfanalysis', component: TfanalysisComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
