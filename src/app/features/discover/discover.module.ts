import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DiscoverPage } from './discover.page';

@NgModule({
  declarations: [DiscoverPage],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: DiscoverPage }])],
})
export class DiscoverModule {}
