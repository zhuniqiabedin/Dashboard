import { ChangeDetectorRef, Component, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faCompass,
  faComments,
  faHouse,
  faMagnifyingGlass,
  faPeopleGroup,
  faPlay,
  faChevronDown,
  faLayerGroup,
  faFileLines,
  faFlag,
  faBookmark,
  faCalendarDays,
  faUsers,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService, AuthUser } from './core/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { MessagesSocketService } from './core/messages-socket.service';
import { MessagingDockComponent } from './shell/messaging-dock.component';

type User = AuthUser;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    FontAwesomeModule,
    MessagingDockComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  readonly faBell = faBell;
  readonly faCompass = faCompass;
  readonly faComments = faComments;
  readonly faHouse = faHouse;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPeopleGroup = faPeopleGroup;
  readonly faPlay = faPlay;
  readonly faChevronDown = faChevronDown;
  readonly faLayers = faLayerGroup;
  readonly faFileLines = faFileLines;
  readonly faFlag = faFlag;
  readonly faBookmark = faBookmark;
  readonly faCalendarDays = faCalendarDays;
  readonly faUsers = faUsers;
  readonly faPlus = faPlus;
  user: User | null = null;
  signup = false;
  awaitingEmailConfirmation = false;
  confirmationEmail = '';
  confirmationCode = '';
  confirmationNotice = '';
  mobileOpen = false;
  userMenu = false;
  notice = '';
  search = '';
  name = '';
  email = '';
  password = '';
  busy = false;
  companyMode = false;
  companyListingMode = false;
  fullHeightChat = false;
  notificationsOpen = false;
  notifications: any[] = [];
  private notificationsTimer?: ReturnType<typeof setInterval>;
  private readonly sessionExpiredSubscription: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly http: HttpClient,
    private readonly messagesSocket: MessagesSocketService,
  ) {
    this.user = this.readUser();
    if (!this.user && sessionStorage.getItem('career-space-session-expired') === 'true') {
      sessionStorage.removeItem('career-space-session-expired');
      this.notice = 'Your session has expired. Please sign in again.';
    }
    this.sessionExpiredSubscription = this.auth.sessionExpired$.subscribe(() => {
      this.messagesSocket.disconnect();
      if (this.notificationsTimer) clearInterval(this.notificationsTimer);
      this.notificationsTimer = undefined;
      this.notifications = [];
      this.user = null;
      this.signup = false;
      this.password = '';
      this.notice = 'Your session has expired. Please sign in again.';
      this.changeDetector.markForCheck();
    });
    if (this.user) {
      this.loadNotifications();
      this.notificationsTimer = setInterval(() => this.loadNotifications(), 30_000);
    }
    if (this.auth.token) this.messagesSocket.connect(this.auth.token);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const parts = event.urlAfterRedirects.split('/').filter(Boolean);
        this.companyMode = parts[0] === 'companies' && parts.length >= 2;
        this.companyListingMode = parts[0] === 'companies' && parts.length === 1;
        this.fullHeightChat =
          parts[0] === 'messages' || (parts[0] === 'companies' && parts.at(-1) === 'messages');
        this.changeDetector.markForCheck();
      });
  }
  ngOnDestroy() {
    if (this.notificationsTimer) clearInterval(this.notificationsTimer);
    this.sessionExpiredSubscription.unsubscribe();
  }

  loadNotifications() {
    this.http
      .get<any[]>(`${environment.apiUrl}/notifications/mine`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => {
          this.notifications = items || [];
          this.changeDetector.markForCheck();
        },
      });
  }
  @HostListener('document:click')
  closeNotificationDropdown(): void {
    this.notificationsOpen = false;
  }
  openNotification(item: any) {
    this.http
      .post(
        `${environment.apiUrl}/notifications/${item._id}/read`,
        {},
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }) },
      )
      .subscribe();
    this.notificationsOpen = false;
    if (item.type === 'event_reminder') {
      void this.router.navigate(['/calendar']);
      return;
    }
    if (item.type === 'job_application_update') {
      void this.router.navigate(['/jobs/applied']);
      return;
    }
    if (item.type === 'project_application_update') {
      void this.router.navigate(['/projects/applied']);
      return;
    }
    if (item.type === 'matching_job') {
      void this.router.navigate(['/discover_jobs']);
      return;
    }
    if (item.type === 'matching_project') {
      void this.router.navigate(['/discover_projects']);
      return;
    }
    if (item.type === 'message') {
      void this.router.navigate(['/messages']);
      return;
    }
    if (item.type === 'company_message') {
      void this.router.navigate(['/companies', item.pageId, 'messages']);
      return;
    }
    void this.router.navigate(
      ['/companies', item.pageId, item.type === 'job_application' ? 'jobs' : 'projects'],
      { queryParams: { applicants: item.itemId } },
    );
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
    if (this.signup) {
      this.auth.register(this.name.trim(), this.email.trim(), this.password).subscribe({
        next: (response) => {
          this.busy = false;
          this.confirmationEmail = response.email;
          this.awaitingEmailConfirmation = true;
          this.confirmationCode = '';
          this.confirmationNotice = '';
          this.changeDetector.markForCheck();
        },
        error: (error: HttpErrorResponse) => this.handleAuthenticationError(error),
      });
      return;
    }
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: ({ user }) => {
        this.busy = false;
        this.completeAuthentication(user);
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => this.handleAuthenticationError(error),
    });
  }
  confirmRegistrationEmail(): void {
    if (this.busy) return;
    this.busy = true;
    this.confirmationNotice = '';
    this.auth.confirmEmail(this.confirmationEmail, this.confirmationCode.trim()).subscribe({
      next: () => {
        this.busy = false;
        this.awaitingEmailConfirmation = false;
        this.signup = false;
        this.email = this.confirmationEmail;
        this.password = '';
        this.confirmationCode = '';
        this.notice = 'Your email is confirmed. You can now log in.';
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.confirmationNotice = error.error?.message || 'Could not confirm your email.';
        this.changeDetector.markForCheck();
      },
    });
  }
  resendRegistrationConfirmation(): void {
    if (this.busy) return;
    this.busy = true;
    this.confirmationNotice = '';
    this.auth.resendConfirmation(this.confirmationEmail).subscribe({
      next: () => {
        this.busy = false;
        this.confirmationNotice = 'If that account needs confirmation, a new code has been sent.';
        this.confirmationCode = '';
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.confirmationNotice = error.error?.message || 'Could not send another code.';
        this.changeDetector.markForCheck();
      },
    });
  }
  private completeAuthentication(user: User): void {
    this.user = user;
    if (this.auth.token) this.messagesSocket.connect(this.auth.token);
    this.loadNotifications();
    if (!this.notificationsTimer)
      this.notificationsTimer = setInterval(() => this.loadNotifications(), 30_000);
    this.password = '';
    void this.router.navigateByUrl('/overview', { replaceUrl: true });
  }
  private handleAuthenticationError(error: HttpErrorResponse): void {
    this.busy = false;
    this.notice =
      error.error?.message ||
      'Could not connect to the server. Make sure the Workpath API is running.';
    this.changeDetector.markForCheck();
  }
  logout(): void {
    this.messagesSocket.disconnect();
    if (this.notificationsTimer) clearInterval(this.notificationsTimer);
    this.notificationsTimer = undefined;
    this.auth.logout();
    this.user = null;
    this.signup = false;
    this.name = '';
    this.email = '';
    this.password = '';
    this.userMenu = false;
    this.mobileOpen = false;
    this.companyMode = false;
    this.notice = '';
    this.search = '';
    this.busy = false;
    // Reload to discard cached service data, pending requests, and socket connections.
    window.location.replace('/login');
  }
}
