import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SkillsChipsComponent } from '../../shared/skills-chips/skills-chips.component';
import { CvPage } from './cv.page';
@NgModule({
  declarations: [CvPage],
  imports: [
    CommonModule,
    FormsModule,
    SkillsChipsComponent,
    RouterModule.forChild([{ path: '', component: CvPage }]),
  ],
})
export class CvModule {}
