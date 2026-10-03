import { Injectable, signal } from '@angular/core';
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
  save(data: CvData): void {
    this.cv.set(data);
    localStorage.setItem('career-space-cv', JSON.stringify(data));
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
