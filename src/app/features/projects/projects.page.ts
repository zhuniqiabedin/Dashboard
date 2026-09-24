import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Branches } from '../../branches';
import { AuthService } from '../../core/auth.service';

type ProjectStatus = 'In progress' | 'Planning';
type StatusFilter = 'All' | ProjectStatus;
type Project = {
  id: string;
  title: string;
  summary: string;
  details: string;
  category: string;
  branch: Branches;
  status: ProjectStatus;
  progress: number;
};

type ProjectDraft = Pick<Project, 'title' | 'summary' | 'details' | 'category' | 'branch'>;

@Component({
  selector: 'app-projects-page',
  standalone: false,
  templateUrl: './projects.page.html',
})
export class ProjectsPage {
  notice = '';
  showNewProjectDialog = false;
  selectedStatus: StatusFilter = 'All';

  readonly statuses: StatusFilter[] = ['All', 'In progress', 'Planning'];
  readonly categories = ['Product design', 'Engineering', 'Marketing', 'Creative'];
  readonly branches = Object.values(Branches).filter((branch) => branch !== Branches.All);
  draft: ProjectDraft = this.emptyDraft();

  private readonly starterProjects: Project[] = [
    {
      id: 'starter-1',
      title: 'Portfolio refresh',
      summary: 'A thoughtful home for the work I want to do more of.',
      details:
        'Collecting selected work, writing case studies, and shaping a personal visual identity.',
      category: 'Product design',
      branch: Branches.IT_Telecommunications,
      status: 'In progress',
      progress: 72,
    },
    {
      id: 'starter-2',
      title: 'UX case study',
      summary: 'Making everyday banking feel a little more human.',
      details:
        'Exploring how customers can understand everyday money decisions with less friction.',
      category: 'Product design',
      branch: Branches.Finance_Marketing_Insurance,
      status: 'In progress',
      progress: 46,
    },
    {
      id: 'starter-3',
      title: 'Learn Figma variables',
      summary: 'A small skill investment with a big creative payoff.',
      details:
        'A learning plan to practice variables, component properties, and reusable design tokens.',
      category: 'Creative',
      branch: Branches.Education,
      status: 'Planning',
      progress: 28,
    },
  ];
  projects: Project[] = [];
  loading = true;
  saving = false;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {
    this.loadProjects();
  }

  get filteredProjects(): Project[] {
    return this.projects.filter(
      (project) => this.selectedStatus === 'All' || project.status === this.selectedStatus,
    );
  }

  openNewProjectDialog(): void {
    this.notice = '';
    this.draft = this.emptyDraft();
    this.showNewProjectDialog = true;
  }

  closeNewProjectDialog(): void {
    this.showNewProjectDialog = false;
  }

  saveProject(): void {
    const title = this.draft.title.trim();
    const summary = this.draft.summary.trim();
    if (!title || !summary) return;

    this.saving = true;
    this.http
      .post<Project>(
        'http://localhost:3000/projects',
        {
          title,
          summary,
          details: this.draft.details.trim(),
          category: this.draft.category,
          branch: this.draft.branch,
          status: 'Planning',
          progress: 0,
        },
        { headers: this.headers() },
      )
      .subscribe({
        next: (project) => {
          this.projects.unshift(project);
          this.selectedStatus = 'All';
          this.notice = 'Your project was added to your list.';
          this.saving = false;
          this.closeNewProjectDialog();
        },
        error: (error) => {
          this.saving = false;
          this.notice = error.error?.message || 'Your project could not be saved.';
        },
      });
  }

  statusCount(status: StatusFilter): number {
    return status === 'All'
      ? this.projects.length
      : this.projects.filter((project) => project.status === status).length;
  }

  branchLabel(branch: Branches): string {
    return branch.replaceAll('_', ' ');
  }

  private emptyDraft(): ProjectDraft {
    return {
      title: '',
      summary: '',
      details: '',
      category: this.categories[0],
      branch: Branches.Other,
    };
  }

  private loadProjects(): void {
    this.http
      .get<Project[]>('http://localhost:3000/projects/mine', { headers: this.headers() })
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.notice = 'Could not load your projects. Check that the API is running.';
        },
      });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
