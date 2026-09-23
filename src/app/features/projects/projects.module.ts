import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectsPage } from './projects.page';
@NgModule({
  declarations: [ProjectsPage],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: ProjectsPage }]),
  ],
})
export class ProjectsModule {}
