import { Routes } from '@angular/router';
import { UserRemoteComponent } from './shell/user-remote.component';

export const routes: Routes = [
  {
    path: '',
    component: UserRemoteComponent,
    children: [
      {
        path: 'overview',
        loadChildren: () =>
          import('./features/overview/overview.module').then((m) => m.OverviewModule),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.module').then((m) => m.ProjectsModule),
      },
      {
        path: 'discover_projects',
        loadChildren: () =>
          import('./features/discover/discover.module').then((m) => m.DiscoverModule),
      },
      { path: 'discover', pathMatch: 'full', redirectTo: 'discover_projects' },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.module').then((m) => m.ProfileModule),
      },
      {
        path: 'companies',
        loadChildren: () =>
          import('./features/companies/companies.module').then((m) => m.CompaniesModule),
      },
      {
        path: 'jobs',
        loadChildren: () => import('./features/jobs/jobs.module').then((m) => m.JobsModule),
      },
      {
        path: 'calendar',
        loadChildren: () =>
          import('./features/calendar/calendar.module').then((m) => m.CalendarModule),
      },
      { path: 'cv', loadChildren: () => import('./features/cv/cv.module').then((m) => m.CvModule) },
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
    ],
  },
  { path: '**', redirectTo: 'overview' },
];
