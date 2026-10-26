import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type AuthUser = { id: string; name: string; email: string; photo?: string };
export type AuthResponse = { accessToken: string; user: AuthUser };
export type RegistrationResponse = { confirmationRequired: true; email: string };

const USER_KEY = 'career-space-user';
const TOKEN_KEY = 'career-space-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionExpiredSubject = new Subject<void>();
  readonly sessionExpired$ = this.sessionExpiredSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((response) => this.saveSession(response)));
  }

  register(name: string, email: string, password: string): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${environment.apiUrl}/auth/register`, {
      name,
      email,
      password,
    });
  }

  confirmEmail(email: string, code: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${environment.apiUrl}/auth/confirm-email`, { email, code });
  }

  resendConfirmation(email: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${environment.apiUrl}/auth/resend-confirmation`, { email });
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  readUser(): AuthUser | null {
    try {
      const value = localStorage.getItem(USER_KEY);
      return value ? (JSON.parse(value) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  saveUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
  }

  expireSession(): void {
    this.logout();
    this.sessionExpiredSubject.next();
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    this.saveUser(response.user);
  }
}
