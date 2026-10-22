import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { matchJobSkills, parseSkills } from '../jobs/job-matching';

type RecommendedJob = {
  _id: string;
  pageId: string;
  companyName: string;
  title: string;
  location: string;
  workplace: string;
  description: string;
  skills?: string[];
  hasApplied: boolean;
};

@Component({
  selector: 'app-overview-page',
  standalone: false,
  templateUrl: './overview.page.html',
})
export class OverviewPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  firstName = 'friend';
  readonly recommendedJobs = signal<
    {
      job: RecommendedJob;
      score: number;
      matchedSkills: string[];
    }[]
  >([]);
  readonly jobsLoading = signal(false);
  readonly jobsError = signal('');
  readonly hasUserSkills = signal(false);
  readonly topRecommendedJobs = computed(() => this.recommendedJobs().slice(0, 3));
  agenda = [
    { title: 'Portfolio review', when: 'Today, 2:30 PM · Personal project' },
    { title: 'Follow up with Northstar', when: 'Tomorrow · Job application' },
  ];
  projects = [
    { name: 'Portfolio refresh', progress: 72 },
    { name: 'UX case study', progress: 46 },
    { name: 'Learn Figma variables', progress: 28 },
  ];
  constructor() {
    try {
      const saved = localStorage.getItem('career-space-user');
      this.firstName = saved
        ? (JSON.parse(saved) as { name: string }).name.split(/\s+/)[0]
        : 'friend';
    } catch {}
    this.loadRecommendedJobs();
  }

  loadRecommendedJobs(): void {
    this.jobsLoading.set(true);
    this.jobsError.set('');
    const options = {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
    };
    forkJoin({
      jobs: this.http.get<RecommendedJob[]>(`${environment.apiUrl}/jobs/published`, options),
      profile: this.http.get<{ skills?: string }>(`${environment.apiUrl}/profiles/me`, options),
    })
      .pipe(finalize(() => this.jobsLoading.set(false)))
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

          const skills = [...parseSkills(profile.skills), ...cvSkills];
          this.hasUserSkills.set(skills.length > 0);
          this.recommendedJobs.set(
            jobs
              .filter((job) => !job.hasApplied)
              .map((job) => {
                const match = matchJobSkills(job.skills ?? [], skills);
                return { job, score: match.score, matchedSkills: match.matched };
              })
              .filter((item) => item.score >= 50)
              .sort((a, b) => b.score - a.score),
          );
        },
        error: () => this.jobsError.set('Could not load job recommendations.'),
      });
  }
}
