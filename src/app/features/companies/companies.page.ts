import { parseSkills } from '../jobs/job-matching';
import { Component, effect, Signal, signal, WritableSignal } from '@angular/core';
import { CompaniesService, Company, PageJob } from '../../core/companies.service';
import { PostalLocationService } from '../../core/postal-location.service';
import { AuthService } from '../../core/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MessagesSocketService } from '../../core/messages-socket.service';
import { Subscription } from 'rxjs';
type Applicant = {
  _id: string;
  userId: { name?: string; email?: string } | null;
  createdAt: string;
  status: string;
  profile?: {
    photo?: string;
    headline?: string;
    location?: string;
    phone?: string;
    skills?: string;
    about?: string;
    experience?: string;
    education?: string;
    website?: string;
    branch?: string;
  } | null;
};
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
  readonly pageJobs;
  readonly jobsLoading;
  readonly jobsError;
  name = '';
  description = '';
  website = '';
  location = '';
  postalCode = '';
  countryCode = 'DE';
  readonly locationLookupLoading: Signal<boolean>;
  readonly locationLookupError: WritableSignal<string>;
  companyDialog = false;
  employeeEmail = '';
  newEmployeeName = '';
  newEmployeeEmail = '';
  newEmployeeGroupId = '';
  newEmployeeRoles = ['member'];
  employeeInviteNotice = '';
  employeeRole = 'member';
  employeeRoles = ['member'];
  employeeGroupId = '';
  companyGroupName = '';
  readonly groupNameDrafts: Record<string, string> = {};
  selected = '';
  notice = '';
  selectedCompanyId = '';
  selectedSection:
    'overview' | 'jobs' | 'projects' | 'roles' | 'employees' | 'settings' | 'groups' = 'overview';
  selectedGroupId = '';
  selectedPageTab: 'posts' | 'about' | 'photos' | 'reviews' | 'more' = 'posts';
  pageNotice = 'Your company page is live';
  projectTitle = '';
  projectLocation = '';
  projectSummary = '';
  readonly applicantJobId = signal('');
  readonly applicantsLoading = signal(false);
  readonly applicantsError = signal('');
  readonly applicantSkills = parseSkills;
  readonly applicants = signal<Applicant[]>([]);
  editingJobId = '';
  jobPublished = false;
  jobTitle = '';
  jobLocation = '';
  jobDescription = '';
  jobSkills: string[] = [];
  jobAnnualSalary = 0;
  jobWorkplace: 'Remote' | 'Hybrid' | 'Onsite' = 'Onsite';
  readonly jobDialog = signal(false);
  projectDialog = false;
  companyConversations: any[] = [];
  selectedCompanyConversation: any = null;
  selectedProjectId = '';
  companyMessageText = '';
  companyMessageQuery = '';
  companyMessageFilter: 'all' | 'unread' = 'all';
  companyMessageError = '';
  companyActiveStatus = true;
  private readonly socketSubscription: Subscription;
  private readonly presenceSubscription: Subscription;
  constructor(
    private readonly service: CompaniesService,
    private readonly locationLookup: PostalLocationService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient,
    socket: MessagesSocketService,
  ) {
    this.locationLookupLoading = locationLookup.loading;
    this.locationLookupError = locationLookup.error;
    effect(() => {
      const result = locationLookup.result();
      if (result) this.location = result.formatted;
    });
    this.companies = service.companies;
    this.loading = service.loading;
    this.saving = service.saving;
    this.error = service.error;
    this.pageProjects = service.pageProjects;
    this.pageJobs = service.pageJobs;
    this.jobsLoading = service.jobsLoading;
    this.jobsError = service.jobsError;
    this.service.load();
    this.socketSubscription = socket.updates().subscribe(() => {
      if (this.selectedSection === 'employees') this.loadCompanyMessages();
    });
    this.presenceSubscription = socket.presence().subscribe((event) => {
      if (!event.userId) return;
      for (const conversation of this.companyConversations) {
        if (
          String(conversation.userId?._id ?? conversation.userId) === String(event.userId) &&
          conversation.userId &&
          typeof conversation.userId === 'object'
        ) {
          conversation.userId.isOnline = event.online && event.active !== false;
          conversation.userId.activeStatus = event.active !== false;
          if (event.lastSeen) conversation.userId.lastSeen = event.lastSeen;
        }
      }
    });
    this.route.paramMap.subscribe((params) => {
      const pageId = params.get('pageId');
      if (pageId) {
        this.selectCompany(pageId, false);
        this.selectedProjectId = params.get('projectId') ?? '';
        const section = this.route.snapshot.url.find((segment) =>
          ['jobs', 'projects', 'settings', 'messages', 'groups'].includes(segment.path),
        )?.path;
        this.selectedGroupId = params.get('groupId') ?? '';
        if (
          section === 'jobs' ||
          section === 'projects' ||
          section === 'settings' ||
          section === 'groups'
        )
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
    this.route.queryParamMap.subscribe((params) => {
      const applicantId = params.get('applicants');
      if (applicantId && this.router.url.includes('/jobs')) this.viewJobApplicants(applicantId);
    });
  }
  ngOnDestroy(): void {
    this.socketSubscription.unsubscribe();
    this.presenceSubscription.unsubscribe();
  }
  isCompanyContactOnline(conversation: any): boolean {
    return conversation?.userId?.activeStatus !== false && conversation?.userId?.isOnline === true;
  }
  companyContactStatus(conversation: any): string {
    const user = conversation?.userId;
    if (user?.activeStatus === false) return 'Offline';
    if (user?.isOnline === true) return 'Online';
    return user?.lastSeen ? `Last seen ${this.companyLastSeenDate(user.lastSeen)}` : 'Offline';
  }
  companyLastSeenDate(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'a while ago'
      : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
  companyConversationTitle(conversation: any): string {
    return (
      conversation?.userId?.name ||
      conversation?.userId?.email ||
      conversation?.pageId?.name ||
      'Conversation'
    );
  }
  companyMessageDate(message: any): string {
    return message?.createdAt
      ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  }
  companyUnreadCount(conversation: any): number {
    return (conversation?.messages || []).filter(
      (message: any) => !this.isOwnCompanyMessage(message) && !message.readAt,
    ).length;
  }
  get filteredCompanyConversations(): any[] {
    const query = this.companyMessageQuery.trim().toLowerCase();
    return this.companyConversations.filter((conversation) => {
      const last = conversation.messages?.at(-1);
      const matchesQuery =
        !query ||
        `${this.companyConversationTitle(conversation)} ${last?.text || last?.attachment?.filename || ''}`
          .toLowerCase()
          .includes(query);
      return (
        matchesQuery &&
        (this.companyMessageFilter === 'all' || this.companyUnreadCount(conversation) > 0)
      );
    });
  }
  selectCompanyConversation(conversation: any): void {
    this.selectedCompanyConversation = conversation;
    this.companyMessageError = '';
    this.http
      .post<any>(
        `${environment.apiUrl}/messages/conversation/${conversation._id}/read`,
        {},
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
        },
      )
      .subscribe({
        next: (updated) =>
          this.updateCompanyConversation({
            ...conversation,
            ...updated,
            userId: updated?.userId ?? conversation.userId,
            pageId: updated?.pageId ?? conversation.pageId,
            projectId: updated?.projectId ?? conversation.projectId,
          }),
      });
  }
  private updateCompanyConversation(conversation: any): void {
    this.selectedCompanyConversation = conversation;
    const index = this.companyConversations.findIndex((item) => item._id === conversation._id);
    if (index >= 0) this.companyConversations[index] = conversation;
  }
  chooseCompanyMessageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const conversation = this.selectedCompanyConversation;
    if (!file || !conversation) return;
    if (
      file.size > 10 * 1024 * 1024 ||
      !(file.type.startsWith('image/') || file.type === 'application/pdf')
    ) {
      this.companyMessageError = 'Choose an image or PDF up to 10 MB.';
      input.value = '';
      return;
    }
    const pageId = conversation.pageId?._id ?? conversation.pageId;
    const projectId = conversation.projectId?._id ?? conversation.projectId ?? 'none';
    const data = new FormData();
    data.append('file', file);
    this.http
      .post(`${environment.apiUrl}/messages/${pageId}/${projectId}/attachment`, data, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: () => this.loadCompanyMessages(),
        error: (error) =>
          (this.companyMessageError = error.error?.message || 'Attachment upload failed.'),
      });
    input.value = '';
  }
  downloadCompanyAttachment(message: any): void {
    const attachment = message?.attachment;
    if (!attachment?.fileId) return;
    this.http
      .get(`${environment.apiUrl}/messages/attachment/${attachment.fileId}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = attachment.filename;
        anchor.click();
        URL.revokeObjectURL(url);
      });
  }
  setCompanyActiveStatus(active: boolean): void {
    this.http
      .patch(
        `${environment.apiUrl}/messages/presence`,
        { active },
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
        },
      )
      .subscribe({
        next: () => (this.companyActiveStatus = active),
        error: (error) =>
          (this.companyMessageError =
            error.error?.message || 'Presence setting could not be updated.'),
      });
  }
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
    this.http
      .post<any>(
        `${environment.apiUrl}/messages/${pageId}/${projectId}`,
        { text: this.companyMessageText.trim(), recipientUserId },
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }) },
      )
      .subscribe({
        next: (updated) => {
          this.companyMessageText = '';
          this.companyMessageError = '';
          this.updateCompanyConversation({
            ...conversation,
            ...updated,
            userId: updated?.userId ?? conversation.userId,
            pageId: updated?.pageId ?? conversation.pageId,
            projectId: updated?.projectId ?? conversation.projectId,
          });
        },
        error: (error) => (this.pageNotice = error.error?.message || 'Message could not be sent.'),
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
    this.postalCode = '';
    this.countryCode = 'DE';
    this.locationLookupError.set('');
    this.companyDialog = false;
    this.notice = 'Company created.';
  }
  closeCompanyDialog(): void {
    this.companyDialog = false;
  }
  lookupCompanyLocation(): void {
    const postalCode = this.postalCode.trim();
    const countryCode = this.countryCode.trim().toUpperCase();
    if (!postalCode || !/^[A-Z]{2}$/.test(countryCode)) {
      this.locationLookupError.set('Enter a postal code and a two-letter country code.');
      return;
    }
    this.locationLookup.lookup(countryCode, postalCode);
  }
  addEmployee(): void {
    if (!this.selected || !this.employeeEmail.trim()) return;
    this.service.addEmployee(
      this.selected,
      this.employeeEmail.trim(),
      this.employeeRoles,
      this.employeeGroupId || undefined,
    );
    this.employeeEmail = '';
    this.employeeGroupId = '';
    this.notice = 'Employee added.';
  }
  createEmployee(companyId: string): void {
    if (!this.newEmployeeName.trim() || !this.newEmployeeEmail.trim()) return;
    this.employeeInviteNotice = '';
    this.service.createEmployee(
      companyId,
      this.newEmployeeName.trim(),
      this.newEmployeeEmail.trim(),
      this.newEmployeeRoles,
      this.newEmployeeGroupId || undefined,
      () => {
        this.newEmployeeName = '';
        this.newEmployeeEmail = '';
        this.newEmployeeGroupId = '';
        this.newEmployeeRoles = ['member'];
        this.employeeInviteNotice = 'Employee created. A confirmation email has been sent.';
      },
    );
  }
  createCompanyGroup(companyId: string): void {
    if (!this.companyGroupName.trim()) return;
    this.service.createGroup(companyId, this.companyGroupName.trim());
    this.companyGroupName = '';
  }
  beginGroupRename(group: { _id: string; name: string }): void {
    this.groupNameDrafts[group._id] = group.name;
  }
  saveGroupRename(companyId: string, groupId: string): void {
    const name = this.groupNameDrafts[groupId]?.trim();
    if (!name) return;
    this.service.renameGroup(companyId, groupId, name);
    delete this.groupNameDrafts[groupId];
  }
  cancelGroupRename(groupId: string): void {
    delete this.groupNameDrafts[groupId];
  }
  deleteCompanyGroup(companyId: string, group: { _id: string; name: string }): void {
    if (window.confirm(`Delete the “${group.name}” group? Employees in it will become unassigned.`))
      this.service.deleteGroup(companyId, group._id);
  }
  employeeGroupFor(employee: { groupId?: string | null }): string {
    return employee.groupId ?? '';
  }
  groupEmployeeCount(company: Pick<Company, 'employees'>, groupId: string): number {
    return this.groupEmployees(company, groupId).length;
  }
  groupEmployees(company: Pick<Company, 'employees'>, groupId: string) {
    return (company.employees ?? []).filter(
      (employee) => this.employeeGroupFor(employee) === groupId,
    );
  }
  employeeGroupName(employee: { groupId?: string | null }): string {
    return (
      this.selectedCompany?.groups?.find((group) => group._id === employee.groupId)?.name ??
      'No group'
    );
  }
  assignEmployeeToGroup(companyId: string, employeeId: string, groupId: string): void {
    this.service.setEmployeeGroup(companyId, employeeId, groupId || null);
  }
  updateEmployeeRole(companyId: string, employeeId: string, roles: string[]): void {
    this.service.updateEmployeeRole(companyId, employeeId, roles);
  }
  removeEmployee(companyId: string, employeeId: string): void {
    this.service.removeEmployee(companyId, employeeId);
  }
  createPageProject(companyId: string): void {
    if (!this.projectTitle.trim() || !this.projectSummary.trim()) return;
    this.service.createProject({
      pageId: companyId,
      title: this.projectTitle.trim(),
      location: this.projectLocation.trim(),
      summary: this.projectSummary.trim(),
      category: 'Company project',
      branch: 'Other',
      startDate: new Date().toISOString(),
    });
    this.projectTitle = '';
    this.projectLocation = '';
    this.projectSummary = '';
    this.pageNotice = 'Project created for this page.';
  }
  viewJobApplicants(jobId: string): void {
    this.applicantJobId.set(jobId);
    this.applicants.set([]);
    this.applicantsError.set('');
    this.applicantsLoading.set(true);
    this.http
      .get<Applicant[]>(`${environment.apiUrl}/jobs/${jobId}/applications`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => {
          if (this.applicantJobId() === jobId) {
            this.applicants.set(items);
            this.applicantsLoading.set(false);
          }
        },
        error: () => {
          if (this.applicantJobId() === jobId) {
            this.applicantsError.set('Could not load applicants.');
            this.applicantsLoading.set(false);
          }
        },
      });
  }
  openJobDialog(job?: PageJob & { _id: string }): void {
    this.editingJobId = job?._id ?? '';
    this.jobTitle = job?.title ?? '';
    this.jobLocation = job?.location ?? '';
    this.jobDescription = job?.description ?? '';
    this.jobAnnualSalary = job?.annualSalary ?? 0;
    this.jobWorkplace = job?.workplace ?? 'Onsite';
    this.jobSkills = [...(job?.skills ?? [])];
    this.jobPublished = job?.isPublished ?? false;
    this.service.error.set('');
    this.jobDialog.set(true);
  }
  createPageJob(companyId: string): void {
    if (
      this.saving() ||
      !this.jobTitle.trim() ||
      !this.jobLocation.trim() ||
      !Number.isFinite(Number(this.jobAnnualSalary)) ||
      Number(this.jobAnnualSalary) < 0
    )
      return;
    const input: PageJob = {
      pageId: companyId,
      title: this.jobTitle.trim(),
      location: this.jobLocation.trim(),
      description: this.jobDescription.trim(),
      annualSalary: Number(this.jobAnnualSalary),
      workplace: this.jobWorkplace,
      skills: this.jobSkills,
      isPublished: this.jobPublished,
    };
    const onSaved = () => {
      this.pageNotice = this.editingJobId ? 'Job updated.' : 'Job created.';
      this.jobDialog.set(false);
      this.editingJobId = '';
    };
    if (this.editingJobId) this.service.updateJob(this.editingJobId, input, companyId, onSaved);
    else this.service.createJob(input, onSaved);
  }
  toggleJobPublication(job: PageJob & { _id: string }): void {
    if (this.saving()) return;
    this.service.updateJob(job._id, { isPublished: !job.isPublished }, job.pageId, () => {
      this.pageNotice = job.isPublished ? 'Job unpublished.' : 'Job published.';
    });
  }
  deleteJob(job: PageJob & { _id: string }): void {
    if (
      this.saving() ||
      !window.confirm(`Delete “${job.title}” from this company? This cannot be undone.`)
    )
      return;
    this.service.deleteJob(job._id, job.pageId);
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
    this.service.loadJobs(id);
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
  openPageGroups(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'groups']);
  }
  openPageInbox(): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'messages']);
  }
  openCompanyGroup(groupId: string): void {
    if (this.selectedCompanyId)
      this.router.navigate(['/companies', this.selectedCompanyId, 'groups', groupId]);
  }
  closeProjectDialog(): void {
    this.projectDialog = false;
    this.router.navigate(['/companies', this.selectedCompanyId]);
  }
  get selectedCompany() {
    return this.companies().find((company) => company._id === this.selectedCompanyId);
  }
  get activeCompanyGroup() {
    return this.selectedCompany?.groups?.find((group) => group._id === this.selectedGroupId);
  }
  get activeGroupEmployees() {
    return (this.selectedCompany?.employees ?? []).filter(
      (employee) => this.employeeGroupFor(employee) === this.selectedGroupId,
    );
  }
}
