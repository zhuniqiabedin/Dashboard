import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
export type Company = {
  _id: string;
  ownerId: string;
  name: string;
  description: string;
  website: string;
  location: string;
  logo?: string;
  employeeIds: string[];
  projectIds: string[];
  groups?: { _id: string; name: string }[];
  jobs?: string[];
  employees?: {
    userId: string | { name?: string; email?: string };
    groupId?: string | null;
    role: 'owner' | 'admin' | 'recruiter' | 'hr' | 'member';
    roles?: ('owner' | 'admin' | 'recruiter' | 'hr' | 'member')[];
  }[];
};
export type PageProject = {
  title: string;
  location?: string;
  summary: string;
  category: string;
  branch: string;
  startDate: string;
  pageId: string;
};
export type PageJob = {
  isPublished?: boolean;
  title: string;
  location: string;
  description: string;
  pageId: string;
  annualSalary?: number;
  workplace: 'Remote' | 'Hybrid' | 'Onsite';
  skills?: string[];
};
@Injectable({ providedIn: 'root' })
export class CompaniesService {
  readonly pageJobs = signal<(PageJob & { _id: string; status: string })[]>([]);
  readonly jobsLoading = signal(false);
  readonly jobsError = signal('');
  private jobsPageId = '';
  readonly companies = signal<Company[]>([]);
  readonly pageProjects = signal<Record<string, any>[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}
  load(): void {
    this.loading.set(true);
    this.http
      .get<Company[]>(`${environment.apiUrl}/companies/mine`, { headers: this.headers() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (value) => this.companies.set(value),
        error: () => this.error.set('Could not load your companies.'),
      });
  }
  create(input: Pick<Company, 'name' | 'description' | 'website' | 'location'>): void {
    this.saving.set(true);
    this.http
      .post(`${environment.apiUrl}/companies`, input, { headers: this.headers() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not create company.'),
      });
  }
  addEmployee(id: string, email: string, roles: string[] = ['member'], groupId?: string): void {
    this.http
      .post(
        `${environment.apiUrl}/companies/${id}/employees`,
        { email, roles, ...(groupId ? { groupId } : {}) },
        { headers: this.headers() },
      )
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not add employee.'),
      });
  }
  createEmployee(
    id: string,
    name: string,
    email: string,
    roles: string[] = ['member'],
    groupId?: string,
    onSent?: () => void,
  ): void {
    this.error.set('');
    this.saving.set(true);
    this.http
      .post(
        `${environment.apiUrl}/companies/${id}/employees/invite`,
        { name, email, roles, ...(groupId ? { groupId } : {}) },
        { headers: this.headers() },
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.load();
          onSent?.();
        },
        error: (error) =>
          this.error.set(
            error.error?.message || 'Could not create employee or send confirmation email.',
          ),
      });
  }
  createGroup(id: string, name: string): void {
    this.http
      .post(`${environment.apiUrl}/companies/${id}/groups`, { name }, { headers: this.headers() })
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not create group.'),
      });
  }
  renameGroup(id: string, groupId: string, name: string): void {
    this.http
      .patch(
        `${environment.apiUrl}/companies/${id}/groups/${groupId}`,
        { name },
        { headers: this.headers() },
      )
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not rename group.'),
      });
  }
  deleteGroup(id: string, groupId: string): void {
    this.http
      .delete(`${environment.apiUrl}/companies/${id}/groups/${groupId}`, {
        headers: this.headers(),
      })
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not delete group.'),
      });
  }
  setEmployeeGroup(id: string, employeeId: string, groupId: string | null): void {
    this.http
      .patch(
        `${environment.apiUrl}/companies/${id}/employees/${employeeId}/group`,
        { groupId },
        { headers: this.headers() },
      )
      .subscribe({
        next: () => this.load(),
        error: (error) =>
          this.error.set(error.error?.message || 'Could not update employee group.'),
      });
  }
  updateEmployeeRole(id: string, employeeId: string, roles: string[]): void {
    this.http
      .patch(
        `${environment.apiUrl}/companies/${id}/employees/${employeeId}/role`,
        { roles },
        { headers: this.headers() },
      )
      .subscribe(() => this.load());
  }
  removeEmployee(id: string, employeeId: string): void {
    this.http
      .delete(`${environment.apiUrl}/companies/${id}/employees/${employeeId}`, {
        headers: this.headers(),
      })
      .subscribe(() => this.load());
  }
  createProject(input: PageProject): void {
    this.http.post(`${environment.apiUrl}/projects`, input, { headers: this.headers() }).subscribe({
      next: () => {
        this.load();
        this.loadProjects(input.pageId);
      },
      error: (error) => this.error.set(error.error?.message || 'Could not create project.'),
    });
  }
  updateProject(id: string, input: Partial<PageProject>): void {
    this.http
      .patch(`${environment.apiUrl}/projects/${id}`, input, { headers: this.headers() })
      .subscribe({
        next: () => this.loadProjects(input.pageId ?? ''),
        error: (error) => this.error.set(error.error?.message || 'Could not update project.'),
      });
  }
  removeProject(id: string, pageId: string): void {
    this.http
      .delete(`${environment.apiUrl}/projects/${id}`, { headers: this.headers() })
      .subscribe({
        next: () => this.loadProjects(pageId),
        error: (error) => this.error.set(error.error?.message || 'Could not delete project.'),
      });
  }
  loadProjects(pageId: string): void {
    this.http
      .get<Record<string, unknown>[]>(`${environment.apiUrl}/projects/page/${pageId}`, {
        headers: this.headers(),
      })
      .subscribe({
        next: (projects) => this.pageProjects.set(projects),
        error: (error) => this.error.set(error.error?.message || 'Could not load page projects.'),
      });
  }
  loadJobs(pageId: string): void {
    this.jobsPageId = pageId;
    this.pageJobs.set([]);
    this.jobsLoading.set(true);
    this.jobsError.set('');
    this.http
      .get<(PageJob & { _id: string; status: string })[]>(
        `${environment.apiUrl}/jobs/page/${pageId}?_=${Date.now()}`,
        { headers: this.headers().set('Cache-Control', 'no-cache') },
      )
      .pipe(
        finalize(() => {
          if (this.jobsPageId === pageId) this.jobsLoading.set(false);
        }),
      )
      .subscribe({
        next: (jobs) => {
          if (this.jobsPageId === pageId) this.pageJobs.set(jobs);
        },
        error: () => {
          if (this.jobsPageId === pageId) this.jobsError.set('Could not load company jobs.');
        },
      });
  }
  createJob(input: PageJob, onCreated: () => void): void {
    this.saving.set(true);
    this.error.set('');
    this.http
      .post(`${environment.apiUrl}/jobs`, input, { headers: this.headers() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.load();
          this.loadJobs(input.pageId);
          onCreated();
        },
        error: (error) => this.error.set(error.error?.message || 'Could not create job.'),
      });
  }
  updateJob(id: string, input: Partial<PageJob>, pageId: string, onSaved: () => void): void {
    this.saving.set(true);
    this.error.set('');
    this.http
      .patch(`${environment.apiUrl}/jobs/${id}`, input, { headers: this.headers() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.loadJobs(pageId);
          onSaved();
        },
        error: (error) => this.error.set(error.error?.message || 'Could not update job.'),
      });
  }
  deleteJob(id: string, pageId: string): void {
    this.saving.set(true);
    this.error.set('');
    this.http
      .delete(`${environment.apiUrl}/jobs/${id}`, { headers: this.headers() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.loadJobs(pageId);
          this.load();
        },
        error: (error) => this.error.set(error.error?.message || 'Could not delete job.'),
      });
  }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
