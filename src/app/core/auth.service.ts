import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type AuthUser = { id: string; name: string; email: string; photo?: string };
export type AuthResponse = { accessToken: string; user: AuthUser };

const API_URL = 'http://localhost:3000';
const USER_KEY = 'career-space-user';
const TOKEN_KEY = 'career-space-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap((response) => this.saveSession(response)));
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, { name, email, password })
      .pipe(tap((response) => this.saveSession(response)));
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    this.saveUser(response.user);
  }
}
