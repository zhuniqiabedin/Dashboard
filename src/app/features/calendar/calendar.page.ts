import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
};

@Component({
  selector: 'app-calendar-page',
  standalone: false,
  templateUrl: './calendar.page.html',
})
export class CalendarPage implements OnInit {
  notice = '';
  error = '';
  loading = false;
  saving = false;
  showEventForm = false;
  offset = 0;
  readonly today = new Date();
  selected = this.today.getDate();
  readonly weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  events: CalendarEvent[] = [];
  newEvent = { title: '', description: '', date: this.localDate(this.today), time: '09:00' };

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  get date(): Date {
    return new Date(this.today.getFullYear(), this.today.getMonth() + this.offset, 1);
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
    const count = start + this.monthLength > 35 ? 42 : 35;
    return Array.from({ length: count }, (_, i) => i - start + 1);
  }

  get selectedDate(): string {
    return this.localDate(new Date(this.date.getFullYear(), this.date.getMonth(), this.selected));
  }

  get minDate(): string {
    return this.localDate(new Date());
  }

  get minTime(): string {
    if (this.newEvent.date !== this.minDate) return '00:00';
    const earliest = new Date();
    earliest.setSeconds(0, 0);
    earliest.setMinutes(earliest.getMinutes() + 1);
    return `${String(earliest.getHours()).padStart(2, '0')}:${String(earliest.getMinutes()).padStart(2, '0')}`;
  }

  get selectedEvents(): CalendarEvent[] {
    return this.events
      .filter((event) => this.localDate(new Date(event.startsAt)) === this.selectedDate)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  shift(value: number): void {
    this.offset += value;
    this.selected = Math.min(this.today.getDate(), this.monthLength);
  }

  goToday(): void {
    this.offset = 0;
    this.selected = this.today.getDate();
  }

  selectDay(day: number): void {
    const selectedDate = new Date(this.date.getFullYear(), this.date.getMonth(), day);
    if (this.isPast(day)) return;
    this.offset =
      (selectedDate.getFullYear() - this.today.getFullYear()) * 12 +
      selectedDate.getMonth() -
      this.today.getMonth();
    this.selected = selectedDate.getDate();
  }

  isToday(day: number): boolean {
    return this.offset === 0 && day === this.today.getDate() && day >= 1 && day <= this.monthLength;
  }

  isSelected(day: number): boolean {
    return this.selected === day;
  }

  isPast(day: number): boolean {
    const dayDate = new Date(this.date.getFullYear(), this.date.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dayDate < today;
  }

  hasEvents(day: number): boolean {
    const eventDate = new Date(this.date.getFullYear(), this.date.getMonth(), day);
    const dateKey = this.localDate(eventDate);
    return this.events.some((event) => this.localDate(new Date(event.startsAt)) === dateKey);
  }

  openEventForm(): void {
    this.error = '';
    this.notice = '';
    this.newEvent = { title: '', description: '', date: this.selectedDate, time: '09:00' };
    this.showEventForm = true;
  }

  saveEvent(): void {
    if (this.saving) return;
    const startsAt = new Date(`${this.newEvent.date}T${this.newEvent.time}`);
    if (Number.isNaN(startsAt.getTime())) {
      this.error = 'Enter a valid event date and time.';
      return;
    }
    if (startsAt.getTime() < Date.now()) {
      this.error = 'Choose a time in the future. Events cannot be scheduled in the past.';
      return;
    }

    this.error = '';
    this.saving = true;
    this.http
      .post<CalendarEvent>(
        `${environment.apiUrl}/calendar/events`,
        {
          title: this.newEvent.title.trim(),
          description: this.newEvent.description.trim(),
          startsAt: startsAt.toISOString(),
        },
        { headers: this.headers() },
      )
      .subscribe({
        next: (event) => {
          this.events = [...this.events, event];
          this.offset =
            (startsAt.getFullYear() - this.today.getFullYear()) * 12 +
            startsAt.getMonth() -
            this.today.getMonth();
          this.selected = startsAt.getDate();
          this.showEventForm = false;
          this.notice = 'Event saved to your calendar.';
          this.saving = false;
        },
        error: (requestError: HttpErrorResponse) => {
          this.error = this.errorMessage(requestError, 'Could not save the event.');
          this.saving = false;
        },
      });
  }

  removeEvent(event: CalendarEvent): void {
    this.error = '';
    this.http
      .delete(`${environment.apiUrl}/calendar/events/${encodeURIComponent(event.id)}`, {
        headers: this.headers(),
      })
      .subscribe({
        next: () => {
          this.events = this.events.filter((item) => item.id !== event.id);
          this.notice = 'Event deleted.';
        },
        error: (requestError: HttpErrorResponse) => {
          this.error = this.errorMessage(requestError, 'Could not delete the event.');
        },
      });
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
      new Date(value),
    );
  }

  private loadEvents(): void {
    this.loading = true;
    this.http
      .get<CalendarEvent[]>(`${environment.apiUrl}/calendar/events`, {
        headers: this.headers(),
      })
      .subscribe({
        next: (events) => {
          this.events = events;
          this.loading = false;
        },
        error: (requestError: HttpErrorResponse) => {
          this.error = this.errorMessage(requestError, 'Could not load calendar events.');
          this.loading = false;
        },
      });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    return typeof error.error?.message === 'string' ? error.error.message : fallback;
  }

  private localDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
