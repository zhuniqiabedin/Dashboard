import { Component } from '@angular/core';
import { Branches } from '../../branches';
import { Project, ProjectStatus, ProjectsService } from '../../core/projects.service';

type StatusFilter = 'All' | ProjectStatus;
type ProjectDraft = Pick<
  Project,
  'title' | 'summary' | 'details' | 'category' | 'branch' | 'startDate' | 'endDate' | 'skills'
>;

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
  readonly projects;
  readonly loading;
  readonly saving;
  draft: ProjectDraft = this.emptyDraft();

  constructor(private readonly projectsService: ProjectsService) {
    this.projects = projectsService.projects;
    this.loading = projectsService.loading;
    this.saving = projectsService.saving;
    this.projectsService.load();
  }

  get filteredProjects(): Project[] {
    return this.projects().filter(
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
    if (!title || !summary || !this.draft.startDate) return;
    this.projectsService.create({
      title,
      summary,
      details: this.draft.details.trim(),
      category: this.draft.category,
      branch: this.draft.branch,
      status: 'Planning',
      progress: 0,
      startDate: this.draft.startDate,
      endDate: this.draft.endDate || undefined,
      skills: this.draft.skills,
    });
    this.selectedStatus = 'All';
    this.notice = 'Your project was added to your list.';
    this.closeNewProjectDialog();
    this.draft = this.emptyDraft();
  }

  statusCount(status: StatusFilter): number {
    return status === 'All'
      ? this.projects().length
      : this.projects().filter((project) => project.status === status).length;
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
      startDate: '',
      endDate: '',
      skills: [],
    };
  }
}
