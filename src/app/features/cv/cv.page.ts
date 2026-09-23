import { Component } from '@angular/core';
@Component({
  selector: 'app-cv-page',
  standalone: false,
  templateUrl: './cv.page.html',
})
export class CvPage {
  name = 'Your Name';
  email = '';
  handle = 'yourname';
  initials = 'YN';
  constructor() {
    try {
      const raw = localStorage.getItem('career-space-user');
      if (raw) {
        const user = JSON.parse(raw) as { name: string; email: string };
        this.name = user.name;
        this.email = user.email;
        this.handle = user.name.toLowerCase().replace(/\s+/g, '');
        this.initials = user.name
          .split(/\s+/)
          .map((x) => x[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
      }
    } catch {}
  }
  notice = '';
}
