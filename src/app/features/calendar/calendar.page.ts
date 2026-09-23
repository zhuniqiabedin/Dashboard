import { Component } from '@angular/core';
@Component({
  selector: 'app-calendar-page',
  standalone: false,
  templateUrl: './calendar.page.html',
})
export class CalendarPage {
  notice = '';
  offset = 0;
  selected = 23;
  weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  get date(): Date {
    return new Date(2026, 8 + this.offset, 1);
  }
  get monthTitle(): string {
    return new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
    }).format(this.date);
  }
  get monthLength(): number {
    return new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).getDate();
  }
  get prevLength(): number {
    return new Date(this.date.getFullYear(), this.date.getMonth(), 0).getDate();
  }
  get days(): number[] {
    const start = (this.date.getDay() + 6) % 7;
    return Array.from({ length: 35 }, (_, i) => i - start + 1);
  }
  shift(value: number): void {
    this.offset += value;
    this.selected = 1;
  }
}
