import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CompaniesPage } from './companies.page';
import { ProjectListComponent } from '../../shared/project-list/project-list.component';
import { ProjectsPage } from '../projects/projects.page';
import { ProjectDetailPage } from '../projects/project-detail.page';
@NgModule({
  declarations: [CompaniesPage],
  imports: [
    CommonModule,
    FormsModule,
    ProjectListComponent,
    ProjectsPage,
    ProjectDetailPage,
    RouterModule.forChild([
      { path: '', component: CompaniesPage },
      { path: ':pageId/projects/new', component: CompaniesPage },
      { path: ':pageId/projects/:projectId', component: CompaniesPage },
      { path: ':pageId/projects', component: CompaniesPage },
      { path: ':pageId/jobs', component: CompaniesPage },
      { path: ':pageId/settings', component: CompaniesPage },
      { path: ':pageId/messages', component: CompaniesPage },
      { path: ':pageId', component: CompaniesPage },
    ]),
  ],
})
export class CompaniesModule {}
