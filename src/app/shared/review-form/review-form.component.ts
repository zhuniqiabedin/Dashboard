import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<form class="mt-3 space-y-3 rounded-xl bg-stone-50 p-3" (ngSubmit)="submit()">
    <p class="text-xs font-semibold text-stone-700">Share structured feedback</p>
    <div class="grid grid-cols-2 gap-2">
      <label class="text-xs"
        >Overall
        <select
          name="overall"
          [(ngModel)]="review.overall"
          class="mt-1 w-full rounded-lg border bg-white p-2"
        >
          <option [ngValue]="5">5 · Excellent</option>
          <option [ngValue]="4">4 · Good</option>
          <option [ngValue]="3">3 · Okay</option>
          <option [ngValue]="2">2 · Poor</option>
          <option [ngValue]="1">1 · Very poor</option>
        </select></label
      >
      <label class="text-xs"
        >Communication
        <select
          name="communication"
          [(ngModel)]="review.communication"
          class="mt-1 w-full rounded-lg border bg-white p-2"
        >
          <option [ngValue]="5">5</option>
          <option [ngValue]="4">4</option>
          <option [ngValue]="3">3</option>
          <option [ngValue]="2">2</option>
          <option [ngValue]="1">1</option>
        </select></label
      >
      <label class="text-xs"
        >Delivery
        <select
          name="delivery"
          [(ngModel)]="review.delivery"
          class="mt-1 w-full rounded-lg border bg-white p-2"
        >
          <option [ngValue]="5">5</option>
          <option [ngValue]="4">4</option>
          <option [ngValue]="3">3</option>
          <option [ngValue]="2">2</option>
          <option [ngValue]="1">1</option>
        </select></label
      >
      <label class="text-xs"
        >Collaboration
        <select
          name="collaboration"
          [(ngModel)]="review.collaboration"
          class="mt-1 w-full rounded-lg border bg-white p-2"
        >
          <option [ngValue]="5">5</option>
          <option [ngValue]="4">4</option>
          <option [ngValue]="3">3</option>
          <option [ngValue]="2">2</option>
          <option [ngValue]="1">1</option>
        </select></label
      >
    </div>
    <textarea
      name="text"
      [(ngModel)]="review.text"
      maxlength="1200"
      rows="2"
      placeholder="What went well? What could improve?"
      class="w-full rounded-lg border bg-white p-2 text-xs"
    ></textarea>
    @if (error) {
      <p class="text-xs text-rose-700">{{ error }}</p>
    }
    @if (saved) {
      <p class="text-xs font-medium text-emerald-700">Feedback submitted.</p>
    } @else {
      <button
        class="rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        [disabled]="saving"
      >
        {{ saving ? 'Submitting…' : 'Submit feedback' }}
      </button>
    }
  </form>`,
})
export class ReviewFormComponent {
  @Input({ required: true }) applicationId = '';
  @Input() context: 'job' | 'project' = 'project';
  @Output() submitted = new EventEmitter<void>();
  review = { overall: 5, communication: 5, delivery: 5, collaboration: 5, text: '' };
  error = '';
  saving = false;
  saved = false;
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}
  submit(): void {
    if (this.saving || this.saved) return;
    this.saving = true;
    this.error = '';
    this.http
      .post(
        `${environment.apiUrl}/reviews`,
        { ...this.review, applicationId: this.applicationId },
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
        },
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.saved = true;
          this.submitted.emit();
        },
        error: (error) => {
          this.saving = false;
          this.error = error.error?.message || 'Could not submit feedback.';
        },
      });
  }
}
