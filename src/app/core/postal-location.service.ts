import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { EMPTY, Subject, catchError, finalize, map, switchMap } from 'rxjs';

type PostalLookupResponse = {
  country?: string;
  places?: Array<Record<string, string>>;
};

export type PostalLocation = {
  city: string;
  region: string;
  country: string;
  formatted: string;
};

type PostalLookupRequest = { countryCode: string; postalCode: string };

@Injectable({ providedIn: 'root' })
export class PostalLocationService {
  readonly loading = signal(false);
  readonly result = signal<PostalLocation | null>(null);
  readonly error = signal('');

  private readonly requests = new Subject<PostalLookupRequest>();

  constructor(private readonly http: HttpClient) {
    this.requests
      .pipe(
        switchMap(({ countryCode, postalCode }) => {
          this.loading.set(true);
          this.error.set('');
          this.result.set(null);
          return this.http
            .get<PostalLookupResponse>(
              `https://api.zippopotam.us/${encodeURIComponent(countryCode)}/${encodeURIComponent(postalCode)}`,
            )
            .pipe(
              map((response) => {
                const place = response.places?.[0];
                if (!place) return null;
                const city = place['place name'] ?? '';
                const region = place['state'] ?? '';
                const country = response.country ?? countryCode;
                return {
                  city,
                  region,
                  country,
                  formatted: [city, region, country].filter(Boolean).join(', '),
                } satisfies PostalLocation;
              }),
              catchError(() => {
                this.error.set('Could not find that postal code. Check the country code and try again.');
                return EMPTY;
              }),
              finalize(() => this.loading.set(false)),
            );
        }),
      )
      .subscribe((location) => {
        if (location) this.result.set(location);
        else this.error.set('No location was found for that postal code.');
      });
  }

  lookup(countryCode: string, postalCode: string): void {
    this.requests.next({
      countryCode: countryCode.trim().toUpperCase(),
      postalCode: postalCode.trim(),
    });
  }
}
