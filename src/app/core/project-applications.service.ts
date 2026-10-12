import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProjectApplicationsService {
  readonly appliedProjectIds = signal<string[]>([]);
  readonly applyingProjectIds = signal<string[]>([]);
  readonly error = signal('');

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  apply(projectId: string): void {
    if (
      this.appliedProjectIds().includes(projectId) ||
      this.applyingProjectIds().includes(projectId)
    ) {
      return;
    }

    this.error.set('');
    this.applyingProjectIds.update((ids) => [...ids, projectId]);
    this.http
      .post<void>(
        `${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/apply`,
        { cv: this.savedCv() },
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }) },
      )
      .pipe(
        finalize(() =>
          this.applyingProjectIds.update((ids) => ids.filter((id) => id !== projectId)),
        ),
      )
      .subscribe({
        next: () =>
          this.appliedProjectIds.update((ids) =>
            ids.includes(projectId) ? ids : [...ids, projectId],
          ),
        error: (requestError) =>
          this.error.set(requestError.error?.message || 'Could not submit application.'),
      });
  }

  private savedCv(): Record<string, unknown> {
    try {
      return JSON.parse(localStorage.getItem('career-space-cv') || '{}');
    } catch {
      return {};
    }
  }
}
