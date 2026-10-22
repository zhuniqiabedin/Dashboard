import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { map, switchMap } from 'rxjs';
export type CvProject = { title: string; description: string; link: string; skills?: string[] };
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
    this.http.get<CvData>(`${environment.apiUrl}/cv/me`, { headers: this.headers() }).subscribe({
      next: (remote) => {
        this.http
          .get<{ skills?: string }>(`${environment.apiUrl}/profiles/me`, {
            headers: this.headers(),
          })
          .subscribe({
            next: (profile) => {
              const profileSkills = (profile.skills || '')
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean);
              const hasRemoteContent =
                remote.skills?.length ||
                remote.projects?.length ||
                remote.education?.length ||
                remote.certificates?.length;
              const local = this.cv();
              const data = hasRemoteContent
                ? {
                    ...this.empty(),
                    ...remote,
                    skills: remote.skills?.length ? remote.skills : profileSkills,
                  }
                : { ...local, skills: local.skills.length ? local.skills : profileSkills };
              this.cv.set(data);
              localStorage.setItem('career-space-cv', JSON.stringify(data));
              if (
                !hasRemoteContent &&
                (data.skills.length ||
                  data.projects.length ||
                  data.education.length ||
                  data.certificates.length)
              ) {
                this.persist(data).subscribe();
              }
            },
          });
      },
    });
  }
  save(data: CvData): void {
    this.cv.set(data);
    localStorage.setItem('career-space-cv', JSON.stringify(data));
    this.persist(data).subscribe();
  }
  persist(data: CvData) {
    this.cv.set(data);
    localStorage.setItem('career-space-cv', JSON.stringify(data));
    return this.http
      .put<CvData>(`${environment.apiUrl}/cv/me`, data, { headers: this.headers() })
      .pipe(
        switchMap((saved) =>
          this.http
            .patch(
              `${environment.apiUrl}/profiles/me`,
              { skills: data.skills.join(', ') },
              { headers: this.headers() },
            )
            .pipe(map(() => saved)),
        ),
      );
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
  private empty(): CvData {
    return { skills: [], projects: [], education: [], certificates: [] };
  }
}
