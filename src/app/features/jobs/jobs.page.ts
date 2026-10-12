import { Component } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { CompaniesService } from '../../core/companies.service';

type ApplicationStatus = 'Interview' | 'In review' | 'Saved' | 'Offer' | 'Rejected';
type JobApplication = {
  role: string;
  company: string;
  location: string;
  status: ApplicationStatus;
  applied: string;
  contact: string;
  mark: string;
  color: string;
};

const SAMPLE_APPLICATIONS: JobApplication[] = [
  {
    mark: 'N',
    color: 'bg-[#e8f3ff] text-[#0a66c2]',
    role: 'Product Designer',
    company: 'Northstar',
    location: 'Remote',
    status: 'Interview',
    applied: '2026-09-18',
    contact: 'Maya L.',
  },
  {
    mark: 'G',
    color: 'bg-[#e7eef3] text-[#59758b]',
    role: 'UX Designer',
    company: 'Goodwell',
    location: 'Belgrade, RS',
    status: 'In review',
    applied: '2026-09-16',
    contact: '—',
  },
  {
    mark: 'F',
    color: 'bg-[#f6ece5] text-[#aa7955]',
    role: 'Senior Product Designer',
    company: 'Forma',
    location: 'Remote',
    status: 'In review',
    applied: '2026-09-12',
    contact: 'Jules R.',
  },
  {
    mark: 'S',
    color: 'bg-[#f0eaf3] text-[#866d8e]',
    role: 'Product Designer',
    company: 'Sunday Studio',
    location: 'Hybrid',
    status: 'Saved',
    applied: '2026-09-10',
    contact: '—',
  },
];

@Component({ selector: 'app-jobs-page', standalone: false, templateUrl: './jobs.page.html' })
export class JobsPage {
  readonly companies;
  jobs: JobApplication[] = [];
  notice = '';
  applicationDialog = false;
  role = '';
  company = '';
  location = '';
  status: ApplicationStatus = 'In review';
  applied = new Date().toISOString().slice(0, 10);
  contact = '';

  constructor(
    private readonly auth: AuthService,
    companiesService: CompaniesService,
  ) {
    this.companies = companiesService.companies;
    companiesService.load();
    this.jobs = this.loadApplications();
  }

  get stats(): { value: string; label: string }[] {
    return [
      {
        value: String(this.jobs.filter((job) => job.status === 'In review').length),
        label: 'In progress',
      },
      {
        value: String(this.jobs.filter((job) => job.status === 'Interview').length),
        label: 'Interviewing',
      },
      { value: String(this.jobs.filter((job) => job.status === 'Offer').length), label: 'Offers' },
      {
        value: String(this.jobs.filter((job) => job.status === 'Saved').length),
        label: 'Recently saved',
      },
    ];
  }

  openApplicationDialog(): void {
    this.notice = '';
    this.applicationDialog = true;
  }

  closeApplicationDialog(): void {
    this.applicationDialog = false;
  }

  addApplication(): void {
    const company = this.company.trim();
    const role = this.role.trim();
    if (!company || !role || !this.location.trim() || !this.applied) return;

    const colors = [
      'bg-[#e8f3ff] text-[#0a66c2]',
      'bg-[#e7eef3] text-[#59758b]',
      'bg-[#f6ece5] text-[#aa7955]',
      'bg-[#f0eaf3] text-[#866d8e]',
    ];
    this.jobs = [
      {
        company,
        role,
        location: this.location.trim(),
        status: this.status,
        applied: this.applied,
        contact: this.contact.trim() || '—',
        mark: company.slice(0, 1).toUpperCase(),
        color: colors[this.jobs.length % colors.length],
      },
      ...this.jobs,
    ];
    this.persistApplications();
    this.applicationDialog = false;
    this.notice = `Application for ${role} at ${company} added.`;
    this.role = '';
    this.company = '';
    this.location = '';
    this.status = 'In review';
    this.applied = new Date().toISOString().slice(0, 10);
    this.contact = '';
  }

  formatApplied(value: string): string {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private storageKey(): string {
    return `career-space-applications-${this.auth.readUser()?.id ?? 'guest'}`;
  }

  private loadApplications(): JobApplication[] {
    try {
      const saved = localStorage.getItem(this.storageKey());
      return saved ? (JSON.parse(saved) as JobApplication[]) : [...SAMPLE_APPLICATIONS];
    } catch {
      return [...SAMPLE_APPLICATIONS];
    }
  }

  private persistApplications(): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.jobs));
  }
}
