import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectsPage } from './projects.page';
import { SkillsChipsComponent } from '../../shared/skills-chips/skills-chips.component';
@NgModule({
  declarations: [ProjectsPage],
  imports: [
    CommonModule,
    FormsModule,
    SkillsChipsComponent,
    RouterModule.forChild([{ path: '', component: ProjectsPage }]),
  ],
})
export class ProjectsModule {}
