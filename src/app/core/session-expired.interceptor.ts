import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const SESSION_EXPIRED_NOTICE_KEY = 'career-space-session-expired';

export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuthenticationRequest = /\/auth\/(login|register)(?:\?|$)/.test(request.urlWithParams);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthenticationRequest &&
        auth.token
      ) {
        auth.expireSession();
        sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, 'true');
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
