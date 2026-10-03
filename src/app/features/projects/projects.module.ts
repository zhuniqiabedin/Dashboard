import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectsPage } from './projects.page';
import { ProjectDetailPage } from './project-detail.page';
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ProjectsPage,
    RouterModule.forChild([{ path: '', component: ProjectsPage }, { path: ':id', component: ProjectDetailPage }]),
  ],
})
export class ProjectsModule {}
