import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-confirm-invite-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './confirm-invite.page.html',
})
export class ConfirmInvitePage {
  readonly token: string;
  password = '';
  confirmPassword = '';
  busy = false;
  error = '';
  complete = false;

  constructor(
    route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.token = route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.error = 'This confirmation link is missing its token.';
  }

  submit(): void {
    this.error = '';
    if (this.password.length < 8 || this.password.length > 200) {
      this.error = 'Choose a password between 8 and 200 characters.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'The passwords do not match.';
      return;
    }
    this.busy = true;
    this.http
      .post(`${environment.apiUrl}/auth/confirm-invite`, {
        token: this.token,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.complete = true;
          this.busy = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Could not confirm this invitation.';
          this.busy = false;
        },
      });
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }
}
