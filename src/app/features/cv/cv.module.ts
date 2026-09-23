import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CvPage } from './cv.page';
@NgModule({
  declarations: [CvPage],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: CvPage }])],
})
export class CvModule {}
