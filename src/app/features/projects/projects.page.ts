import { Component, Input, computed, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Branches } from '../../branches';
import { Project, ProjectStatus, ProjectsService } from '../../core/projects.service';
import { CompaniesService } from '../../core/companies.service';
import { SkillsChipsComponent } from '../../shared/skills-chips/skills-chips.component';

type StatusFilter = 'All' | ProjectStatus;
type ProjectDraft = Pick<
  Project,
  'title' | 'summary' | 'details' | 'category' | 'branch' | 'startDate' | 'endDate' | 'skills' | 'isPublished' | 'publishAt' | 'unpublishAt'
>;

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkillsChipsComponent],
  templateUrl: './projects.page.html',
})
export class ProjectsPage {
  @Input() pageId = '';
  notice = '';
  showNewProjectDialog = false;
  editingProjectId = '';
  selectedStatus: StatusFilter = 'All';
  readonly statuses: StatusFilter[] = ['All', 'In progress', 'Planning'];
  readonly categories = ['Product design', 'Engineering', 'Marketing', 'Creative'];
  readonly branches = Object.values(Branches).filter((branch) => branch !== Branches.All);
  readonly projects = computed<Project[]>(() => this.pageId ? this.companiesService.pageProjects().map((project: any) => ({ ...project, id: project.id ?? project._id, details: project.details ?? '', category: project.category ?? 'Company project', branch: project.branch ?? Branches.Other, status: project.status ?? 'Planning', progress: project.progress ?? 0, startDate: project.startDate ?? '', skills: project.skills ?? [], isPublished: project.isPublished ?? false })) : this.projectsService.projects());
  get loading() { return this.projectsService.loading; }
  get saving() { return this.projectsService.saving; }
  draft: ProjectDraft = this.emptyDraft();

  constructor(private readonly projectsService: ProjectsService, private readonly companiesService: CompaniesService) {
    this.projectsService.load();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageId']?.currentValue) this.companiesService.loadProjects(this.pageId);
  }

  get filteredProjects(): Project[] {
    return this.projects().filter(
      (project) => this.selectedStatus === 'All' || project.status === this.selectedStatus,
    );
  }
  openNewProjectDialog(): void {
    this.notice = '';
    this.draft = this.emptyDraft();
    this.editingProjectId = '';
    this.showNewProjectDialog = true;
  }
  openEditProject(project: Project): void { this.editingProjectId = project.id; this.draft = { title: project.title, summary: project.summary, details: project.details, category: project.category, branch: project.branch, startDate: project.startDate?.slice(0, 10) ?? '', endDate: project.endDate?.slice(0, 10) ?? '', skills: [...project.skills], isPublished: project.isPublished ?? false, publishAt: this.dateTimeValue(project.publishAt), unpublishAt: this.dateTimeValue(project.unpublishAt) }; this.showNewProjectDialog = true; }
  togglePublish(project: Project): void {
    const payload = { ...project, isPublished: !project.isPublished, id: undefined } as Omit<Project, 'id'>;
    if (this.pageId) this.companiesService.updateProject(project.id, { ...payload, pageId: this.pageId });
    else this.projectsService.update(project.id, payload);
  }
  deleteProject(project: Project): void {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    if (this.pageId) this.companiesService.removeProject(project.id, this.pageId);
    else this.projectsService.remove(project.id);
  }
  closeNewProjectDialog(): void {
    this.showNewProjectDialog = false;
  }

  saveProject(): void {
    const title = this.draft.title.trim();
    const summary = this.draft.summary.trim();
    if (!title || !summary || !this.draft.startDate) return;
    const project: Omit<Project, 'id'> = {
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
      isPublished: this.draft.isPublished,
      publishAt: this.draft.publishAt || undefined,
      unpublishAt: this.draft.unpublishAt || undefined,
    };
    if (this.editingProjectId) {
      if (this.pageId) this.companiesService.updateProject(this.editingProjectId, { ...project, pageId: this.pageId });
      else this.projectsService.update(this.editingProjectId, project);
    } else if (this.pageId) this.companiesService.createProject({ ...project, pageId: this.pageId });
    else this.projectsService.create(project);
    this.selectedStatus = 'All';
    this.notice = this.editingProjectId ? 'Project updated.' : this.pageId ? 'The page project was added.' : 'Your project was added to your list.';
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
      isPublished: false,
      publishAt: '',
      unpublishAt: '',
    };
  }
  private dateTimeValue(value?: string): string { return value ? value.slice(0, 16) : ''; }
}
