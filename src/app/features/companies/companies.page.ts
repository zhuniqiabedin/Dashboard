import { Component } from '@angular/core';
import { CompaniesService } from '../../core/companies.service';
import { AuthService } from '../../core/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MessagesSocketService } from '../../core/messages-socket.service';
import { Subscription } from 'rxjs';
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
  companyDialog = false;
  employeeEmail = '';
  employeeRole = 'member';
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
  jobAnnualSalary = 0;
  projectDialog = false;
  companyConversations: any[] = [];
  selectedCompanyConversation: any = null;
  selectedProjectId = '';
  companyMessageText = '';
  private readonly socketSubscription: Subscription;
  constructor(
    private readonly service: CompaniesService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient,
    socket: MessagesSocketService,
  ) {
    this.companies = service.companies;
    this.loading = service.loading;
    this.saving = service.saving;
    this.error = service.error;
    this.pageProjects = service.pageProjects;
    this.service.load();
    this.socketSubscription = socket.updates().subscribe(() => {
      if (this.selectedSection === 'employees') this.loadCompanyMessages();
    });
    this.route.paramMap.subscribe((params) => {
      const pageId = params.get('pageId');
      if (pageId) {
        this.selectCompany(pageId, false);
        this.selectedProjectId = params.get('projectId') ?? '';
        const section = this.route.snapshot.url.find((segment) =>
          ['jobs', 'projects', 'settings', 'messages'].includes(segment.path),
        )?.path;
        if (section === 'jobs' || section === 'projects' || section === 'settings')
          this.selectedSection = section;
        else if (section === 'messages') {
          this.selectedSection = 'employees';
          this.loadCompanyMessages();
        } else this.selectedSection = 'overview';
        this.projectDialog = this.route.snapshot.url.some((segment) => segment.path === 'new');
      } else {
        this.selectedCompanyId = '';
        this.projectDialog = false;
        window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: false }));
      }
    });
  }
  ngOnDestroy(): void { this.socketSubscription.unsubscribe(); }
  loadCompanyMessages(pageId = this.selectedCompanyId): void {
    if (!pageId) return;
    this.http
      .get<any[]>(`${environment.apiUrl}/messages/page/${pageId}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => {
          this.companyConversations = items ?? [];
          this.selectedCompanyConversation =
            this.companyConversations.find(
              (item) => item._id === this.selectedCompanyConversation?._id,
            ) ??
            this.companyConversations[0] ??
            null;
        },
        error: (error) =>
          (this.pageNotice = error.error?.message || 'Company messages could not be loaded.'),
      });
  }
  isOwnCompanyMessage(message: any): boolean {
    const senderId = message?.senderId?._id ?? message?.senderId;
    return String(senderId) === String(this.auth.readUser()?.id ?? '');
  }
  sendCompanyMessage(): void {
    const conversation = this.selectedCompanyConversation;
    if (!conversation || !this.companyMessageText.trim()) return;
    const pageId = conversation.pageId?._id ?? conversation.pageId;
    const projectId = conversation.projectId?._id ?? conversation.projectId;
    const recipientUserId = conversation.userId?._id ?? conversation.userId;
    this.http.post<any>(`${environment.apiUrl}/messages/${pageId}/${projectId}`, { text: this.companyMessageText.trim(), recipientUserId }, { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }) }).subscribe({
      next: (updated) => {
        this.companyMessageText = '';
        this.selectedCompanyConversation = updated;
        const index = this.companyConversations.findIndex((item) => item._id === updated._id);
        if (index >= 0) this.companyConversations[index] = updated;
      },
      error: (error) => this.pageNotice = error.error?.message || 'Message could not be sent.',
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
    this.companyDialog = false;
    this.notice = 'Company created.';
  }
  closeCompanyDialog(): void {
    this.companyDialog = false;
  }
  addEmployee(): void {
    if (!this.selected || !this.employeeEmail.trim()) return;
    this.service.addEmployee(this.selected, this.employeeEmail.trim(), this.employeeRole);
    this.employeeEmail = '';
    this.notice = 'Employee added.';
  }
  updateEmployeeRole(companyId: string, employeeId: string, role: string): void {
    this.service.updateEmployeeRole(companyId, employeeId, role);
  }
  removeEmployee(companyId: string, employeeId: string): void {
    this.service.removeEmployee(companyId, employeeId);
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
      annualSalary: Number(this.jobAnnualSalary) || 0,
    });
    this.jobTitle = '';
    this.jobLocation = '';
    this.jobDescription = '';
    this.jobAnnualSalary = 0;
    this.pageNotice = 'Job created for this page.';
  }
  creatorName(value: unknown): string {
    return typeof value === 'object' && value !== null && 'name' in value
      ? String((value as { name?: string }).name ?? 'a page member')
      : 'a page member';
  }
  employeeId(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && '_id' in value)
      return String((value as { _id?: string })._id ?? '');
    return '';
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
  openPageJobs(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'jobs']);
  }
  openPageHome(): void {
    if (this.selectedCompanyId) this.router.navigate(['/companies', this.selectedCompanyId]);
  }
  openPageSettings(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'settings']);
  }
  openPageInbox(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'messages']);
  }
  closeProjectDialog(): void {
    this.projectDialog = false;
    this.router.navigate(['/companies', this.selectedCompanyId]);
  }
  get selectedCompany() {
    return this.companies().find((company) => company._id === this.selectedCompanyId);
  }
}
