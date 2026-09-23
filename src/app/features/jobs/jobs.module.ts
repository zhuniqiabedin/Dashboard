import { NgModule } from '@angular/core'; import { CommonModule } from '@angular/common'; import { RouterModule } from '@angular/router'; import { JobsPage } from './jobs.page';
@NgModule({ declarations: [JobsPage], imports: [CommonModule, RouterModule.forChild([{ path: '', component: JobsPage }])] }) export class JobsModule {}
