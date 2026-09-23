import { NgModule } from '@angular/core'; import { CommonModule } from '@angular/common'; import { RouterModule } from '@angular/router'; import { ProjectsPage } from './projects.page';
@NgModule({ declarations: [ProjectsPage], imports: [CommonModule, RouterModule.forChild([{ path: '', component: ProjectsPage }])] }) export class ProjectsModule {}
