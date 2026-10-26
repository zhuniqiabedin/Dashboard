import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { matchJobSkills, parseSkills } from './job-matching';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type PublishedJob = {
  hasApplied: boolean;
  isCompanyDraft?: boolean;
  _id: string;
  pageId: string;
  companyName: string;
  title: string;
  location: string;
  description: string;
  annualSalary: number;
  workplace: string;
  skills?: string[];
};

@Component({
  selector: 'app-published-jobs-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <h1 class="text-3xl font-semibold">Find your next job</h1>
      <p class="mt-2 text-sm text-stone-500">
        Your 10 newest matching jobs, based on skills in your CV and profile.
      </p>
      <div class="mt-5 flex gap-3">
        <button
          class="rounded-xl border px-4 py-2 text-sm"
          [class.bg-blue-100]="recommended()"
          [attr.aria-pressed]="recommended()"
          (click)="recommended.set(true)"
        >
          For you
        </button>
        <button
          class="rounded-xl border px-4 py-2 text-sm"
          [class.bg-blue-100]="!recommended()"
          [attr.aria-pressed]="!recommended()"
          (click)="recommended.set(false)"
        >
          All jobs
        </button>
      </div>
      <div
        class="mt-6 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-[1fr_200px]"
      >
        <div>
          <label for="job-search" class="mb-2 block text-sm font-medium">Search jobs</label>
          <input
            id="job-search"
            class="profile-input"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Job title, company, location, or skill"
            type="search"
          />
        </div>
        <div>
          <label for="job-arrangement" class="mb-2 block text-sm font-medium"
            >Work arrangement</label
          >
          <select
            id="job-arrangement"
            class="profile-input"
            [ngModel]="workplace()"
            (ngModelChange)="workplace.set($event)"
          >
            <option value="">All arrangements</option>
            <option>Remote</option>
            <option>Hybrid</option>
            <option>Onsite</option>
          </select>
        </div>
      </div>
      @if (loading()) {
        <p class="mt-6 text-sm text-stone-500" role="status">Loading jobs…</p>
      } @else if (error()) {
        <div class="mt-6 text-sm text-red-700" role="alert">
          {{ error() }} <button class="underline" (click)="load()">Try again</button>
        </div>
      } @else {
        @if (recommended()) {
          <p class="mt-4 text-sm text-stone-500">
            At least 50% of listed skills match. Newest jobs first.
          </p>
          @if (!userSkills().length) {
            <p class="mt-4 text-sm">
              Add skills to your
              <a routerLink="/profile" class="text-blue-600 underline">profile</a> or
              <a routerLink="/cv" class="text-blue-600 underline">CV</a> to see matching jobs.
            </p>
          }
        }
        <p class="mt-6 text-sm text-stone-500" aria-live="polite">
          {{ results().length }} jobs found
        </p>
        <div class="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          @for (job of results(); track job._id) {
            <article class="rounded-2xl border border-stone-200 bg-white p-6">
              <a
                [routerLink]="['/company', job.pageId]"
                class="text-sm font-medium text-[#2864dc] hover:underline"
                >{{ job.companyName }}</a
              >
              @if (job.isCompanyDraft) {
                <span class="ml-2 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                  Unpublished · company members only
                </span>
              }
              @if (job.match.score > 0) {
                <p class="mt-2 text-xs font-medium text-green-700">
                  {{ job.match.score }}% skill match · {{ job.match.matched.join(', ') }}
                </p>
              }
              <h2 class="mt-2 text-lg font-semibold">{{ job.title }}</h2>
              <p class="mt-2 text-sm text-stone-500">
                {{ job.location }} · {{ job.workplace || 'Onsite' }}
              </p>
              <p class="mt-3 text-sm font-medium">
                {{ job.annualSalary | currency: 'EUR' : 'symbol' : '1.0-2' }} / year
              </p>
              <p class="mt-4 text-sm break-words whitespace-pre-line text-stone-600">
                {{ job.description }}
              </p>
              <h3 class="mt-4 text-xs font-semibold text-stone-600">Skills</h3>
              <ul class="mt-2 flex flex-wrap gap-2">
                @for (skill of job.skills || []; track $index) {
                  <li
                    class="max-w-full rounded-full bg-[#e8f3ff] px-2.5 py-1 text-xs break-words text-[#0a66c2]"
                  >
                    {{ skill }}
                  </li>
                } @empty {
                  <li class="text-xs text-stone-400">No skills specified.</li>
                }
              </ul>
              @if (job.isCompanyDraft) {
                <p class="mt-5 border-t border-stone-100 pt-4 text-xs text-stone-500">
                  This job is visible only to members of your company until it is published.
                </p>
              } @else {
              <div class="mt-5 border-t border-stone-100 pt-4">
                <p class="mb-3 text-xs text-stone-500">
                  Applying shares your name, email, skills, profile details, and phone number (if
                  provided) with this company.
                </p>
                <button
                  class="rounded-xl bg-[#2864dc] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  [disabled]="job.hasApplied || applying().includes(job._id)"
                  (click)="apply(job)"
                >
                  {{
                    job.hasApplied
                      ? 'Applied'
                      : applying().includes(job._id)
                        ? 'Applying…'
                        : 'Apply for job'
                  }}
                </button>
                @if (job.hasApplied) {
                  <p class="mt-2 text-xs text-green-700" role="status">Application submitted.</p>
                }
                @if (applicationErrors()[job._id]) {
                  <p class="mt-2 text-xs text-red-700" role="alert">
                    {{ applicationErrors()[job._id] }}
                  </p>
                }
              </div>
              }
            </article>
          } @empty {
            <p class="py-8 text-sm text-stone-500 md:col-span-2 xl:col-span-3">
              {{
                recommended()
                  ? 'No matching jobs found. Update your skills or browse All jobs.'
                  : 'No jobs match your search. Try another keyword or arrangement.'
              }}
            </p>
          }
        </div>
      }
    </section>
  `,
})
export class PublishedJobsPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly applying = signal<string[]>([]);
  readonly applicationErrors = signal<Record<string, string>>({});
  readonly recommended = signal(true);
  readonly userSkills = signal<string[]>([]);
  readonly jobs = signal<PublishedJob[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly query = signal('');
  readonly workplace = signal('');
  readonly results = computed(() => {
    const terms = this.query().toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = this.jobs()
      .map((job) => ({ ...job, match: matchJobSkills(job.skills ?? [], this.userSkills()) }))
      .filter((job) => {
        const text = [
          job.title,
          job.companyName,
          job.location,
          job.description,
          ...(job.skills ?? []),
        ]
          .join(' ')
          .toLowerCase();
        return (
          (!this.recommended() || job.match.score >= 50 || job.isCompanyDraft) &&
          (!this.workplace() || (job.workplace || 'Onsite') === this.workplace()) &&
          terms.every((term) => text.includes(term))
        );
      });
    return this.recommended() ? matches.slice(0, 10) : matches;
  });
  constructor() {
    this.load();
  }
  apply(job: PublishedJob): void {
    if (job.isCompanyDraft || job.hasApplied || this.applying().includes(job._id)) return;
    this.applying.update((ids) => [...ids, job._id]);
    this.applicationErrors.update((errors) => ({ ...errors, [job._id]: '' }));
    this.http
      .post(
        `${environment.apiUrl}/jobs/${job._id}/apply`,
        {},
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
        },
      )
      .pipe(finalize(() => this.applying.update((ids) => ids.filter((id) => id !== job._id))))
      .subscribe({
        next: () =>
          this.jobs.update((jobs) =>
            jobs.map((item) => (item._id === job._id ? { ...item, hasApplied: true } : item)),
          ),
        error: (error) =>
          this.applicationErrors.update((errors) => ({
            ...errors,
            [job._id]: error.error?.message || 'Could not submit your application. Try again.',
          })),
      });
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    const options = {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
    };
    forkJoin({
      jobs: this.http.get<PublishedJob[]>(`${environment.apiUrl}/jobs/published`, options),
      profile: this.http.get<{ skills?: string }>(`${environment.apiUrl}/profiles/me`, options),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ jobs, profile }) => {
          let cvSkills: string[] = [];
          try {
            const cv = JSON.parse(localStorage.getItem('career-space-cv') || '{}');
            cvSkills = parseSkills(cv.skills);
            if (Array.isArray(cv.projects)) {
              cvSkills.push(
                ...cv.projects.flatMap((project: { skills?: unknown }) =>
                  parseSkills(project?.skills),
                ),
              );
            }
          } catch {
            /* A missing or invalid local CV does not prevent profile matching. */
          }
          this.userSkills.set([...parseSkills(profile.skills), ...cvSkills]);
          this.jobs.set(jobs);
        },
        error: () => this.error.set('Could not load jobs and profile matches. Please try again.'),
      });
  }
}
