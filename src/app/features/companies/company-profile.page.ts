import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { catchError, filter, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ProjectApplicationsService } from '../../core/project-applications.service';
import { environment } from '../../../environments/environment';

type CompanyProject = {
  _id: string;
  title: string;
  summary: string;
  details?: string;
  category: string;
  skills?: string[];
  hourlyRate?: number;
  startDate?: string;
  endDate?: string;
};
type CompanyJob = {
  _id: string;
  title: string;
  description: string;
  location: string;
  workplace: string;
  annualSalary?: number;
  skills?: string[];
};
type CompanyProfile = {
  projects: CompanyProject[];
  jobs: CompanyJob[];
  employeeCount: number;
  name: string;
  description: string;
  location?: string;
  website?: string;
  logo?: string;
};
@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './company-profile.page.html',
})
export class CompanyProfilePage implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly selectedTab = signal<'posts' | 'about' | 'projects' | 'jobs'>('posts');
  readonly company = signal<CompanyProfile | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  private readonly projectApplications = inject(ProjectApplicationsService);
  readonly appliedProjects = this.projectApplications.appliedProjectIds;
  readonly applyingProjects = this.projectApplications.applyingProjectIds;
  readonly applicationError = this.projectApplications.error;
  private readonly subscription = inject(ActivatedRoute)
    .paramMap.pipe(
      switchMap((params) => {
        this.loading.set(true);
        this.error.set('');
        this.company.set(null);
        this.selectedTab.set(this.routeTab());
        return this.http
          .get<CompanyProfile>(
            `${environment.apiUrl}/companies/${encodeURIComponent(params.get('pageId') ?? '')}/profile`,
            {
              headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
            },
          )
          .pipe(
            catchError((error) => {
              this.error.set(
                error.status === 404
                  ? 'Company not found.'
                  : 'Could not load the company. Please try again.',
              );
              return of(null);
            }),
          );
      }),
    )
    .subscribe((company) => {
      this.company.set(company);
      this.loading.set(false);
    });
  private readonly navigationSubscription = this.router.events
    .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe(() => {
      this.selectedTab.set(this.routeTab());
    });
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.navigationSubscription.unsubscribe();
  }
  get companyId(): string {
    return this.router.url.split('?')[0].split('/')[2] ?? '';
  }
  private routeTab(): 'posts' | 'about' | 'projects' | 'jobs' {
    const section = this.router.url.split('?')[0].split('/').at(-1);
    return section === 'posts' || section === 'projects' || section === 'jobs' ? section : 'about';
  }
  websiteUrl(value?: string): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  applyProject(project: CompanyProject): void {
    this.projectApplications.apply(project._id);
  }
}
