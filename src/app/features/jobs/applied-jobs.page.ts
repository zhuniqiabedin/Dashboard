import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { ReviewFormComponent } from '../../shared/review-form/review-form.component';
@Component({
  selector: 'app-applied-jobs',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewFormComponent],
  template: ` <section class="mx-auto max-w-5xl rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
    <h1 class="text-3xl font-semibold">Applied jobs</h1>
    <p class="mt-2 text-sm text-stone-500">Your submitted job applications.</p>
    @if (error()) {
      <p class="mt-5 text-red-700">{{ error() }}</p>
    } @else if (loading()) {
      <p class="mt-5">Loading…</p>
    } @else {
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        @for (application of applications(); track application._id) {
          <article
            class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-lg"
          >
            <a
              class="text-sm text-blue-700 hover:underline"
              [routerLink]="['/company', companyId(application)]"
              >{{ application.company?.name || application.job?.companyName || 'Company' }}</a
            >
            <h2 class="mt-1 text-lg font-semibold">{{ application.job?.title || 'Job' }}</h2>
            <p class="mt-2 text-sm text-stone-500">
              {{ application.job?.location }} · {{ application.status }} · Applied
              {{ application.createdAt | date: 'mediumDate' }}
            </p>
            @if (application.status === 'Completed') {
              <app-review-form [applicationId]="application._id" context="job"></app-review-form>
            }
          </article>
        } @empty {
          <p class="rounded-xl border bg-white p-6 text-stone-500 sm:col-span-2">
            You have not applied to any jobs yet.
          </p>
        }
      </div>
    }
  </section>`,
})
export class AppliedJobsPage {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  applications = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  constructor() {
    this.http
      .get<any[]>(`${environment.apiUrl}/jobs/applications/mine`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => {
          this.applications.set(items || []);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(e.error?.message || 'Could not load applications.');
          this.loading.set(false);
        },
      });
  }
  companyId(application: any) {
    return application.company?._id || application.pageId;
  }
}
