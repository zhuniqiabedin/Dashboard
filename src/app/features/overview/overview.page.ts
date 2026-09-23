import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-overview-page',
  standalone: false,
  templateUrl: './overview.page.html',
})
export class OverviewPage {
  firstName = 'friend';
  agenda = [
    { title: 'Portfolio review', when: 'Today, 2:30 PM · Personal project' },
    { title: 'Follow up with Northstar', when: 'Tomorrow · Job application' },
  ];
  projects = [
    { name: 'Portfolio refresh', progress: 72 },
    { name: 'UX case study', progress: 46 },
    { name: 'Learn Figma variables', progress: 28 },
  ];
  constructor() {
    try {
      const saved = localStorage.getItem('career-space-user');
      this.firstName = saved
        ? (JSON.parse(saved) as { name: string }).name.split(/\s+/)[0]
        : 'friend';
    } catch {}
  }
}
