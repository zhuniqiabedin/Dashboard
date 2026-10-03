import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CompaniesPage } from './companies.page';
import { ProjectListComponent } from '../../shared/project-list/project-list.component';
import { ProjectsPage } from '../projects/projects.page';
@NgModule({
  declarations: [CompaniesPage],
  imports: [
    CommonModule,
    FormsModule,
    ProjectListComponent,
    ProjectsPage,
    RouterModule.forChild([
      { path: '', component: CompaniesPage },
      { path: ':pageId', component: CompaniesPage },
      { path: ':pageId/projects', component: CompaniesPage },
      { path: ':pageId/projects/new', component: CompaniesPage },
    ]),
  ],
})
export class CompaniesModule {}
