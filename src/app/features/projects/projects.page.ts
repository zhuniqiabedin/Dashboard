import { Component, Input, computed, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Branches } from '../../branches';
import { Project, ProjectStatus, ProjectsService } from '../../core/projects.service';
import { CompaniesService } from '../../core/companies.service';
import { SkillsChipsComponent } from '../../shared/skills-chips/skills-chips.component';
import { CvService } from '../../core/cv.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';

type StatusFilter = 'All' | ProjectStatus;
type ProjectDraft = Pick<
  Project,
  | 'title'
  | 'location'
  | 'summary'
  | 'details'
  | 'category'
  | 'branch'
  | 'startDate'
  | 'endDate'
  | 'skills'
  | 'isPublished'
  | 'publishAt'
  | 'unpublishAt'
  | 'hourlyRate'
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
  publicationFilter: 'All' | 'Published' | 'Publish' = 'All';
  matchMySkills = false;
  selectedEmployeeId = '';
  readonly statuses: StatusFilter[] = ['All', 'In progress', 'Planning'];
  readonly categories = ['Product design', 'Engineering', 'Marketing', 'Creative'];
  readonly branches = Object.values(Branches).filter((branch) => branch !== Branches.All);
  readonly projects = computed<Project[]>(() =>
    this.pageId
      ? this.companiesService.pageProjects().map((project: any) => ({
          ...project,
          id: project.id ?? project._id,
          details: project.details ?? '',
          category: project.category ?? 'Company project',
          branch: project.branch ?? Branches.Other,
          status: project.status ?? 'Planning',
          progress: project.progress ?? 0,
          startDate: project.startDate ?? '',
          skills: project.skills ?? [],
          isPublished: project.isPublished ?? false,
        }))
      : this.projectsService.projects(),
  );
  get loading() {
    return this.projectsService.loading;
  }
  get saving() {
    return this.projectsService.saving;
  }
  draft: ProjectDraft = this.emptyDraft();
  readonly applicantProjectId = signal('');
  readonly projectApplicants = signal<any[]>([]);
  readonly applicantError = signal('');

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly companiesService: CompaniesService,
    private readonly cvService: CvService,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.projectsService.load();
    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('applicants');
      if (id && this.pageId) this.viewApplicants({ id } as Project);
    });
  }
  viewApplicants(project: Project) {
    this.applicantProjectId.set(project.id);
    this.projectApplicants.set([]);
    this.applicantError.set('');
    this.http
      .get<any[]>(`${environment.apiUrl}/projects/${project.id}/applications`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => this.projectApplicants.set(items || []),
        error: (e) =>
          this.applicantError.set(e.error?.message || 'Could not load project applicants.'),
      });
  }
  applicantSkills(value: unknown): string[] {
    if (Array.isArray(value))
      return value
        .map(String)
        .map((skill) => skill.trim())
        .filter(Boolean);
    const text = String(value ?? '').trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* older profile skills are comma separated */
    }
    return text
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageId']?.currentValue) {
      this.companiesService.loadProjects(this.pageId);
      const applicantId = this.route.snapshot.queryParamMap.get('applicants');
      if (applicantId) this.viewApplicants({ id: applicantId } as Project);
    }
  }

  get filteredProjects(): Project[] {
    const skills = this.cvService.cv().skills.map((skill) => skill.toLowerCase());
    return this.projects().filter((project) => {
      const statusMatches = this.selectedStatus === 'All' || project.status === this.selectedStatus;
      const publicationMatches =
        this.publicationFilter === 'All' ||
        (this.publicationFilter === 'Published'
          ? project.isPublished === true
          : project.isPublished !== true);
      const matches = project.skills.filter((skill) => skills.includes(skill.toLowerCase())).length;
      const skillMatches =
        !this.matchMySkills ||
        (skills.length > 0 && matches / Math.max(project.skills.length, 1) >= 0.5);
      return statusMatches && publicationMatches && skillMatches;
    });
  }
  get companyEmployees(): any[] {
    return this.pageId
      ? (this.companiesService.companies().find((company) => company._id === this.pageId)
          ?.employees ?? [])
      : [];
  }
  employeeUserId(employee: any): string {
    return String(employee?.userId?._id ?? employee?.userId ?? '');
  }
  employeeName(employee: any): string {
    return employee?.userId?.name || employee?.userId?.email || 'Company employee';
  }
  discoverProjectsForEmployee(): void {
    if (!this.pageId || !this.selectedEmployeeId) return;
    void this.router.navigate([
      '/discover_projects',
      'employee',
      this.pageId,
      this.selectedEmployeeId,
    ]);
  }
  openNewProjectDialog(): void {
    if (!this.pageId) return;
    this.notice = '';
    this.draft = this.emptyDraft();
    this.editingProjectId = '';
    this.showNewProjectDialog = true;
  }
  openEditProject(project: Project): void {
    if (!this.pageId) return;
    this.editingProjectId = project.id;
    this.draft = {
      title: project.title,
      location: project.location ?? '',
      summary: project.summary,
      details: project.details,
      category: project.category,
      branch: project.branch,
      startDate: project.startDate?.slice(0, 10) ?? '',
      endDate: project.endDate?.slice(0, 10) ?? '',
      skills: [...project.skills],
      isPublished: project.isPublished ?? false,
      publishAt: this.dateTimeValue(project.publishAt),
      unpublishAt: this.dateTimeValue(project.unpublishAt),
      hourlyRate: project.hourlyRate ?? 0,
    };
    this.showNewProjectDialog = true;
  }
  togglePublish(project: Project): void {
    if (!this.pageId) return;
    const payload = { ...project, isPublished: !project.isPublished, id: undefined } as Omit<
      Project,
      'id'
    >;
    if (this.pageId)
      this.companiesService.updateProject(project.id, { ...payload, pageId: this.pageId });
    else this.projectsService.update(project.id, payload);
  }
  deleteProject(project: Project): void {
    if (!this.pageId) return;
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    if (this.pageId) this.companiesService.removeProject(project.id, this.pageId);
    else this.projectsService.remove(project.id);
  }
  closeNewProjectDialog(): void {
    this.showNewProjectDialog = false;
  }

  saveProject(): void {
    if (!this.pageId) return;
    const title = this.draft.title.trim();
    const summary = this.draft.summary.trim();
    if (!title || !summary || !this.draft.startDate) return;
    const project: Omit<Project, 'id'> = {
      title,
      location: this.draft.location?.trim() ?? '',
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
      hourlyRate: Number(this.draft.hourlyRate) || 0,
    };
    if (this.editingProjectId) {
      if (this.pageId)
        this.companiesService.updateProject(this.editingProjectId, {
          ...project,
          pageId: this.pageId,
        });
      else this.projectsService.update(this.editingProjectId, project);
    } else if (this.pageId)
      this.companiesService.createProject({ ...project, pageId: this.pageId });
    else this.projectsService.create(project);
    this.selectedStatus = 'All';
    this.notice = this.editingProjectId
      ? 'Project updated.'
      : this.pageId
        ? 'The page project was added.'
        : 'Your project was added to your list.';
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
      location: '',
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
      hourlyRate: 0,
    };
  }
  private dateTimeValue(value?: string): string {
    return value ? value.slice(0, 16) : '';
  }
}
