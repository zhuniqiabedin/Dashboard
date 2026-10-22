import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { UserRemoteComponent } from './shell/user-remote.component';

const requireSession: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !!(auth.token && auth.readUser()) || inject(Router).createUrlTree(['/login']);
};

const requireGuest: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !(auth.token && auth.readUser()) || inject(Router).createUrlTree(['/overview']);
};

export const routes: Routes = [
  {
    path: 'confirm-invite',
    loadComponent: () =>
      import('./features/auth/confirm-invite.page').then((m) => m.ConfirmInvitePage),
  },
  {
    path: 'login',
    pathMatch: 'full',
    canActivate: [requireGuest],
    // AppComponent displays the login form when there is no authenticated user.
    children: [],
  },
  {
    path: '',
    component: UserRemoteComponent,
    canActivate: [requireSession],
    canActivateChild: [requireSession],
    children: [
      {
        path: 'overview',
        loadChildren: () =>
          import('./features/overview/overview.module').then((m) => m.OverviewModule),
      },
      {
        path: 'projects',
        pathMatch: 'full',
        redirectTo: 'discover_projects',
      },
      {
        path: 'discover_projects',
        loadChildren: () =>
          import('./features/discover/discover.module').then((m) => m.DiscoverModule),
      },
      {
        path: 'discover_users/:projectId',
        loadChildren: () =>
          import('./features/discover/discover.module').then((m) => m.DiscoverModule),
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('./features/messages/messages.module').then((m) => m.MessagesModule),
      },
      { path: 'discover', pathMatch: 'full', redirectTo: 'discover_projects' },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.module').then((m) => m.ProfileModule),
      },
      {
        path: 'company/:pageId/posts',
        loadComponent: () =>
          import('./features/companies/company-profile.page').then((m) => m.CompanyProfilePage),
      },
      {
        path: 'company/:pageId/projects',
        loadComponent: () =>
          import('./features/companies/company-profile.page').then((m) => m.CompanyProfilePage),
      },
      {
        path: 'company/:pageId/jobs',
        loadComponent: () =>
          import('./features/companies/company-profile.page').then((m) => m.CompanyProfilePage),
      },
      {
        path: 'company/:pageId',
        loadComponent: () =>
          import('./features/companies/company-profile.page').then((m) => m.CompanyProfilePage),
      },
      {
        path: 'companies',
        loadChildren: () =>
          import('./features/companies/companies.module').then((m) => m.CompaniesModule),
      },
      {
        path: 'jobs/applied',
        loadComponent: () =>
          import('./features/jobs/applied-jobs.page').then((m) => m.AppliedJobsPage),
      },
      {
        path: 'discover_jobs',
        loadComponent: () =>
          import('./features/jobs/published-jobs.page').then((m) => m.PublishedJobsPage),
      },
      {
        path: 'jobs',
        pathMatch: 'full',
        redirectTo: 'discover_jobs',
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
