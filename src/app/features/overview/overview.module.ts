import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OverviewPage } from './overview.page';

@NgModule({
  declarations: [OverviewPage],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: OverviewPage }])],
})
export class OverviewModule {}
