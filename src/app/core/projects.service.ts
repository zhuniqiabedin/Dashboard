import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { finalize, timeout } from 'rxjs';
import { Branches } from '../branches';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export type ProjectStatus = 'In progress' | 'Planning';
export type Project = {
  id: string;
  title: string;
  summary: string;
  details: string;
  category: string;
  branch: Branches;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate?: string;
  skills: string[];
  isPublished?: boolean;
  publishAt?: string;
  unpublishAt?: string;
};
type ApiProject = Omit<Project, 'id'> & { id?: string; _id?: string };
type ProjectsResponse = ApiProject[] | { projects?: ApiProject[]; data?: ApiProject[] };

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<ProjectsResponse>(`${environment.apiUrl}/projects/mine`, { headers: this.headers() })
      .pipe(
        timeout(10000),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const projects = Array.isArray(response)
            ? response
            : (response.projects ?? response.data ?? []);
          this.projects.set(
            projects.map(
              (project) =>
                ({
                  ...project,
                  id: project.id ?? project._id ?? crypto.randomUUID(),
                  skills: project.skills ?? [],
                  isPublished: project.isPublished ?? false,
                }) as Project,
            ),
          );
        },
        error: (requestError) => {
          this.error.set(
            requestError.name === 'TimeoutError'
              ? 'The project request timed out. Check that the API URL and port are correct.'
              : 'Could not load your projects. Check that the API is running and you are signed in.',
          );
        },
      });
  }

  create(project: Omit<Project, 'id'>): void {
    this.saving.set(true);
    this.http
      .post(`${environment.apiUrl}/projects`, project, { headers: this.headers() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.load(),
        error: (requestError) =>
          this.error.set(requestError.error?.message || 'Your project could not be saved.'),
      });
  }
  update(id: string, project: Omit<Project, 'id'>): void {
    this.saving.set(true);
    this.http.patch(`${environment.apiUrl}/projects/${id}`, project, { headers: this.headers() }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.load(), error: (error) => this.error.set(error.error?.message || 'Your project could not be updated.') });
  }
  remove(id: string): void {
    this.saving.set(true);
    this.http.delete(`${environment.apiUrl}/projects/${id}`, { headers: this.headers() }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.load(),
      error: (error) => this.error.set(error.error?.message || 'Your project could not be deleted.'),
    });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
