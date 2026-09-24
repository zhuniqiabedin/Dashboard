import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, AuthUser } from './core/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

type User = AuthUser;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {
  user: User | null = null;
  signup = false;
  mobileOpen = false;
  userMenu = false;
  notice = '';
  search = '';
  name = '';
  email = '';
  password = '';
  busy = false;

  constructor(private readonly auth: AuthService) {
    this.user = this.readUser();
  }

  private readUser(): User | null {
    return this.auth.token ? this.auth.readUser() : null;
  }
  @HostListener('window:career-space-profile-updated')
  refreshUser(): void {
    this.user = this.readUser();
  }
  get firstName(): string {
    return this.user?.name.trim().split(/\s+/)[0] || 'friend';
  }
  get initials(): string {
    return (
      this.user?.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CS'
    );
  }
  get todayLabel(): string {
    return new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  }
  authenticate(): void {
    this.notice = '';
    this.busy = true;
    const request = this.signup
      ? this.auth.register(this.name.trim(), this.email.trim(), this.password)
      : this.auth.login(this.email.trim(), this.password);
    request.subscribe({
      next: ({ user }) => {
        this.user = user;
        this.password = '';
        this.busy = false;
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.notice =
          error.error?.message ||
          'Could not connect to the server. Make sure the Career Space API is running.';
      },
    });
  }
  logout(): void {
    this.auth.logout();
    this.user = null;
    this.password = '';
    this.userMenu = false;
  }
}
