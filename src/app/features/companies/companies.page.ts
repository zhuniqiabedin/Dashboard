import { Component } from '@angular/core';
import { CompaniesService } from '../../core/companies.service';
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
  constructor(private readonly service: CompaniesService) {
    this.companies = service.companies;
    this.loading = service.loading;
    this.saving = service.saving;
    this.error = service.error;
    this.service.load();
    window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: false }));
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
  get canCreateCompany(): boolean {
    return this.companies().length < 2;
  }
  selectCompany(id: string): void {
    this.selectedCompanyId = id;
    this.selectedSection = 'overview';
    window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: true }));
  }
  leaveCompany(): void {
    this.selectedCompanyId = '';
    window.dispatchEvent(new CustomEvent('career-space-company-mode', { detail: false }));
  }
  get selectedCompany() {
    return this.companies().find((company) => company._id === this.selectedCompanyId);
  }
}
