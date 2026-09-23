import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type User = { name: string; email: string; photo?: string };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {
  user: User | null = this.readUser();
  signup = false;
  mobileOpen = false;
  userMenu = false;
  notice = '';
  search = '';
  name = '';
  email = '';
  password = '';
  private readUser(): User | null {
    try {
      const value = localStorage.getItem('career-space-user');
      return value ? (JSON.parse(value) as User) : null;
    } catch {
      return null;
    }
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
    const fallback = this.email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    this.user = { name: this.name.trim() || fallback, email: this.email.trim() };
    localStorage.setItem('career-space-user', JSON.stringify(this.user));
    this.password = '';
  }
  logout(): void {
    localStorage.removeItem('career-space-user');
    this.user = null;
    this.password = '';
    this.userMenu = false;
  }
}
