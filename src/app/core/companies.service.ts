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
  jobIds: string[];
};
export type PageProject = {
  title: string;
  summary: string;
  category: string;
  branch: string;
  startDate: string;
  pageId: string;
};
export type PageJob = { title: string; location: string; description: string; pageId: string };
@Injectable({ providedIn: 'root' })
export class CompaniesService {
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
  addEmployee(id: string, email: string): void {
    this.http
      .post(
        `${environment.apiUrl}/companies/${id}/employees`,
        { email },
        { headers: this.headers() },
      )
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not add employee.'),
      });
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
    this.http.patch(`${environment.apiUrl}/projects/${id}`, input, { headers: this.headers() }).subscribe({
      next: () => this.loadProjects(input.pageId ?? ''),
      error: (error) => this.error.set(error.error?.message || 'Could not update project.'),
    });
  }
  removeProject(id: string, pageId: string): void {
    this.http.delete(`${environment.apiUrl}/projects/${id}`, { headers: this.headers() }).subscribe({
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
  createJob(input: PageJob): void {
    this.http.post(`${environment.apiUrl}/jobs`, input, { headers: this.headers() }).subscribe({
      next: () => this.load(),
      error: (error) => this.error.set(error.error?.message || 'Could not create job.'),
    });
  }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
