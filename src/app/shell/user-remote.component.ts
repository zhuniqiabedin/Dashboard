import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-user-remote',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-[calc(100vh-72px)] bg-white">
      @if (false) {
        <aside
          [class.hidden]="companyMode"
          class="fixed top-[72px] bottom-0 left-0 z-10 hidden w-[248px] flex-col border-r border-stone-200 bg-white px-4 py-6 md:flex"
        >
          <div class="mb-6 px-3 text-[10px] font-semibold tracking-[.16em] text-stone-400">
            WORKSPACE
          </div>
          <nav class="space-y-1">
            <a routerLink="/overview" routerLinkActive="nav-active" class="nav-item"
              ><span>⌂</span> Overview</a
            >
            <a routerLink="/projects" routerLinkActive="nav-active" class="nav-item"
              ><span>▧</span> My projects</a
            >
            <a routerLink="/jobs" routerLinkActive="nav-active" class="nav-item"
              ><span>◫</span> Jobs</a
            >
            <a routerLink="/calendar" routerLinkActive="nav-active" class="nav-item"
              ><span>▦</span> Calendar</a
            >
            <a routerLink="/cv" routerLinkActive="nav-active" class="nav-item"
              ><span>▤</span> My CV</a
            >
            <a routerLink="/companies" routerLinkActive="nav-active" class="nav-item"
              ><span>▥</span> Pages</a
            >
          </nav>
        </aside>
      }
      <main class="min-w-0">
        <router-outlet />
      </main>
    </div>
  `,
})
export class UserRemoteComponent {
  companyMode = false;

  @HostListener('window:career-space-company-mode', ['$event'])
  setCompanyMode(event: Event): void {
    this.companyMode = (event as CustomEvent<boolean>).detail;
  }
}
