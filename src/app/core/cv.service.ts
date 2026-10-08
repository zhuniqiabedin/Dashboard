import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
export type CvProject = { title: string; description: string; link: string };
export type CvEducation = { school: string; degree: string; period: string };
export type CvCertificate = { name: string; issuer: string; year: string };
export type CvData = {
  skills: string[];
  projects: CvProject[];
  education: CvEducation[];
  certificates: CvCertificate[];
};
@Injectable({ providedIn: 'root' })
export class CvService {
  readonly cv = signal<CvData>(this.load());
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {
    this.http
      .get<{ skills?: string }>(`${environment.apiUrl}/profiles/me`, { headers: this.headers() })
      .subscribe({
        next: (profile) => {
          if (profile.skills)
            this.cv.update((value) => ({
              ...value,
              skills: profile
                .skills!.split(',')
                .map((skill) => skill.trim())
                .filter(Boolean),
            }));
        },
      });
  }
  save(data: CvData): void {
    this.cv.set(data);
    localStorage.setItem('career-space-cv', JSON.stringify(data));
    this.http
      .patch(
        `${environment.apiUrl}/profiles/me`,
        { skills: data.skills.join(', ') },
        { headers: this.headers() },
      )
      .subscribe();
  }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
  private load(): CvData {
    const empty: CvData = { skills: [], projects: [], education: [], certificates: [] };
    try {
      return { ...empty, ...JSON.parse(localStorage.getItem('career-space-cv') || '{}') };
    } catch {
      return empty;
    }
  }
}
