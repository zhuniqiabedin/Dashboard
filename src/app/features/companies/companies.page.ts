import { Component } from '@angular/core';
import { CompaniesService } from '../../core/companies.service';
import { AuthService } from '../../core/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-companies-page',
  standalone: false,
  templateUrl: './companies.page.html',
})
export class CompaniesPage {
  readonly companies;
  readonly loading;
  readonly saving;
  readonly error;
  readonly pageProjects;
  name = '';
  description = '';
  website = '';
  location = '';
  employeeEmail = '';
  selected = '';
  notice = '';
  selectedCompanyId = '';
  selectedSection: 'overview' | 'jobs' | 'projects' | 'roles' | 'employees' | 'settings' =
    'overview';
  selectedPageTab: 'posts' | 'about' | 'photos' | 'reviews' | 'more' = 'posts';
  pageNotice = 'Your company page is live';
  projectTitle = '';
  projectSummary = '';
  jobTitle = '';
  jobLocation = '';
  jobDescription = '';
  projectDialog = false;
  constructor(
    private readonly service: CompaniesService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.companies = service.companies;
    this.loading = service.loading;
    this.saving = service.saving;
    this.error = service.error;
    this.pageProjects = service.pageProjects;
    this.service.load();
    this.route.paramMap.subscribe((params) => {
      const pageId = params.get('pageId');
      if (pageId) {
        this.selectCompany(pageId, false);
        if (this.route.snapshot.url.some((segment) => segment.path === 'projects'))
          this.selectedSection = 'projects';
        this.projectDialog = this.route.snapshot.url.some((segment) => segment.path === 'new');
      } else {
        this.selectedCompanyId = '';
        this.projectDialog = false;
        window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: false }));
      }
    });
  }
  create(): void {
    if (!this.name.trim() || !this.description.trim()) return;
    this.service.create({
      name: this.name.trim(),
      description: this.description.trim(),
      website: this.website.trim(),
      location: this.location.trim(),
    });
    this.name = '';
    this.description = '';
    this.website = '';
    this.location = '';
    this.notice = 'Company created.';
  }
  addEmployee(): void {
    if (!this.selected || !this.employeeEmail.trim()) return;
    this.service.addEmployee(this.selected, this.employeeEmail.trim());
    this.employeeEmail = '';
    this.notice = 'Employee added.';
  }
  createPageProject(companyId: string): void {
    if (!this.projectTitle.trim() || !this.projectSummary.trim()) return;
    this.service.createProject({
      pageId: companyId,
      title: this.projectTitle.trim(),
      summary: this.projectSummary.trim(),
      category: 'Company project',
      branch: 'Other',
      startDate: new Date().toISOString(),
    });
    this.projectTitle = '';
    this.projectSummary = '';
    this.pageNotice = 'Project created for this page.';
  }
  createPageJob(companyId: string): void {
    if (!this.jobTitle.trim() || !this.jobLocation.trim()) return;
    this.service.createJob({
      pageId: companyId,
      title: this.jobTitle.trim(),
      location: this.jobLocation.trim(),
      description: this.jobDescription.trim(),
    });
    this.jobTitle = '';
    this.jobLocation = '';
    this.jobDescription = '';
    this.pageNotice = 'Job created for this page.';
  }
  creatorName(value: unknown): string {
    return typeof value === 'object' && value !== null && 'name' in value
      ? String((value as { name?: string }).name ?? 'a page member')
      : 'a page member';
  }
  get canCreateCompany(): boolean {
    const userId = this.auth.readUser()?.id;
    return this.companies().filter((company) => company.ownerId === userId).length < 2;
  }
  selectCompany(id: string, navigate = true): void {
    this.selectedCompanyId = id;
    this.selectedSection = 'overview';
    this.selectedPageTab = 'posts';
    this.service.loadProjects(id);
    window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: true }));
    if (navigate && this.route.snapshot.paramMap.get('pageId') !== id)
      this.router.navigate(['/companies', id]);
  }
  leaveCompany(): void {
    this.selectedCompanyId = '';
    window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: false }));
    this.router.navigate(['/companies']);
  }
  openProjectDialog(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'projects', 'new']);
  }
  openPageProjects(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'projects']);
  }
  closeProjectDialog(): void {
    this.projectDialog = false;
    this.router.navigate(['/companies', this.selectedCompanyId]);
  }
  get selectedCompany() {
    return this.companies().find((company) => company._id === this.selectedCompanyId);
  }
}
