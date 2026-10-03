import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
export type Company = {
  _id: string;
  name: string;
  description: string;
  website: string;
  location: string;
  employeeIds: string[];
  projectIds: string[];
  jobIds: string[];
};
@Injectable({ providedIn: 'root' })
export class CompaniesService {
  readonly companies = signal<Company[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}
  load(): void {
    this.loading.set(true);
    this.http
      .get<Company[]>(`${environment.apiUrl}/companies/mine`, { headers: this.headers() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (value) => this.companies.set(value),
        error: () => this.error.set('Could not load your companies.'),
      });
  }
  create(input: Pick<Company, 'name' | 'description' | 'website' | 'location'>): void {
    this.saving.set(true);
    this.http
      .post(`${environment.apiUrl}/companies`, input, { headers: this.headers() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not create company.'),
      });
  }
  addEmployee(id: string, email: string): void {
    this.http
      .post(
        `${environment.apiUrl}/companies/${id}/employees`,
        { email },
        { headers: this.headers() },
      )
      .subscribe({
        next: () => this.load(),
        error: (error) => this.error.set(error.error?.message || 'Could not add employee.'),
      });
  }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
