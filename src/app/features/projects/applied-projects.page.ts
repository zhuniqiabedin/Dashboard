import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { ReviewFormComponent } from '../../shared/review-form/review-form.component';

@Component({
  selector: 'app-applied-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewFormComponent],
  template: `<section class="mx-auto max-w-5xl py-8">
    <h1 class="text-3xl font-semibold">Applied projects</h1>
    <p class="mt-2 text-sm text-stone-500">Check the status of your project applications.</p>
    @if (error()) {
      <p class="mt-5 text-rose-700">{{ error() }}</p>
    } @else if (loading()) {
      <p class="mt-5">Loading…</p>
    } @else {
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        @for (application of applications(); track application._id) {
          <article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <a
              class="text-sm text-blue-700 hover:underline"
              [routerLink]="['/company', application.company?._id || application.pageId]"
              >{{ application.company?.name || 'Company' }}</a
            >
            <h2 class="mt-1 text-lg font-semibold">
              {{ application.project?.title || 'Project' }}
            </h2>
            <p class="mt-2 text-sm text-stone-500">
              {{ application.status }} · Applied {{ application.createdAt | date: 'mediumDate' }}
            </p>
            @if (application.status === 'Completed') {
              <app-review-form
                [applicationId]="application._id"
                context="project"
              ></app-review-form>
            }
          </article>
        } @empty {
          <p class="rounded-xl border bg-white p-6 text-stone-500 sm:col-span-2">
            You haven’t applied to any projects yet.
          </p>
        }
      </div>
    }
  </section>`,
})
export class AppliedProjectsPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly applications = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.http
      .get<any[]>(`${environment.apiUrl}/projects/applications/mine`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => {
          this.applications.set(items || []);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.error?.message || 'Could not load project applications.');
          this.loading.set(false);
        },
      });
  }
}
