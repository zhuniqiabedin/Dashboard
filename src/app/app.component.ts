import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell, faCompass, faComments, faHouse, faMagnifyingGlass, faPeopleGroup, faPlay, faChevronDown, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { AuthService, AuthUser } from './core/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

type User = AuthUser;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet, FontAwesomeModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly faBell = faBell; readonly faCompass = faCompass; readonly faComments = faComments; readonly faHouse = faHouse; readonly faMagnifyingGlass = faMagnifyingGlass; readonly faPeopleGroup = faPeopleGroup; readonly faPlay = faPlay; readonly faChevronDown = faChevronDown; readonly faLayers = faLayerGroup;
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
  companyMode = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {
    this.user = this.readUser();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      const parts = event.urlAfterRedirects.split('/').filter(Boolean);
      this.companyMode = parts[0] === 'companies' && parts.length >= 2;
    });
  }

  private readUser(): User | null {
    return this.auth.token ? this.auth.readUser() : null;
  }
  @HostListener('window:career-space-profile-updated')
  refreshUser(): void {
    this.user = this.readUser();
  }
  @HostListener('window:career-space-company-mode', ['$event'])
  setCompanyMode(event: Event): void {
    this.companyMode = (event as CustomEvent<boolean>).detail;
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
