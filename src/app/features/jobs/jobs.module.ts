import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { JobsPage } from './jobs.page';
@NgModule({
  declarations: [JobsPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: JobsPage }])],
})
export class JobsModule {}
