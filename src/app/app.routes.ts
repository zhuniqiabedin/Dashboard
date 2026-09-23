import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'overview', loadChildren: () => import('./features/overview/overview.module').then(m => m.OverviewModule) },
  { path: 'projects', loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule) },
  { path: 'jobs', loadChildren: () => import('./features/jobs/jobs.module').then(m => m.JobsModule) },
  { path: 'calendar', loadChildren: () => import('./features/calendar/calendar.module').then(m => m.CalendarModule) },
  { path: 'cv', loadChildren: () => import('./features/cv/cv.module').then(m => m.CvModule) },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '**', redirectTo: 'overview' }
];
