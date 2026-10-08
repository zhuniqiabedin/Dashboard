import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CvEducation, CvCertificate, CvProject, CvService } from '../../core/cv.service';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
type CvProfile = {
  name: string;
  email: string;
  headline: string;
  location: string;
  about: string;
  website: string;
  experience: string;
  photo: string;
};
@Component({ selector: 'app-cv-page', standalone: false, templateUrl: './cv.page.html' })
export class CvPage implements OnInit {
  readonly cv;
  notice = '';
  editing = false;
  editingProjectIndex: number | null = null;
  projectDraft: CvProject | null = null;
  profile: CvProfile = {
    name: 'Your Name', email: '', headline: '', location: '', about: '', website: '', experience: '', photo: '',
  };
  newProject: CvProject = { title: '', description: '', link: '', skills: [] };
  newEducation: CvEducation = { school: '', degree: '', period: '' };
  newCertificate: CvCertificate = { name: '', issuer: '', year: '' };
  constructor(
    private readonly service: CvService,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {
    this.cv = service.cv;
  }
  ngOnInit(): void {
    const user = this.auth.readUser();
    this.profile.name = user?.name || this.profile.name;
    this.profile.email = user?.email || '';
    this.http.get<Partial<CvProfile>>(`${environment.apiUrl}/profiles/me`, { headers: this.headers() })
      .subscribe({ next: (profile) => this.profile = { ...this.profile, ...profile } });
  }
  get initials(): string {
    return this.profile.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }
  update(partial: object): void {
    const next = { ...this.cv(), ...partial };
    this.service.save(next);
  }
  addProject(): void {
    if (!this.newProject.title.trim()) return;
    this.update({ projects: [...this.cv().projects, { ...this.newProject }] });
    this.newProject = { title: '', description: '', link: '', skills: [] };
  }
  editProject(index: number): void {
    const project = this.cv().projects[index];
    if (!project) return;
    this.editingProjectIndex = index;
    this.projectDraft = { ...project, skills: [...(project.skills ?? [])] };
  }
  setProjectDraftSkills(skills: string[]): void {
    if (this.projectDraft) this.projectDraft = { ...this.projectDraft, skills };
  }
  saveProject(index: number): void {
    const draft = this.projectDraft;
    if (!draft?.title.trim() || this.editingProjectIndex !== index) return;
    const projects = this.cv().projects.map((project, projectIndex) =>
      projectIndex === index ? draft : project,
    );
    this.update({ projects });
    this.cancelProjectEdit();
  }
  cancelProjectEdit(): void {
    this.editingProjectIndex = null;
    this.projectDraft = null;
  }
  removeProject(i: number): void {
    this.update({ projects: this.cv().projects.filter((_, index) => index !== i) });
    this.cancelProjectEdit();
  }
  addEducation(): void {
    if (!this.newEducation.school.trim() || !this.newEducation.degree.trim()) return;
    this.update({ education: [...this.cv().education, { ...this.newEducation }] });
    this.newEducation = { school: '', degree: '', period: '' };
  }
  removeEducation(i: number): void {
    this.update({ education: this.cv().education.filter((_, index) => index !== i) });
  }
  addCertificate(): void {
    if (!this.newCertificate.name.trim()) return;
    this.update({ certificates: [...this.cv().certificates, { ...this.newCertificate }] });
    this.newCertificate = { name: '', issuer: '', year: '' };
  }
  removeCertificate(i: number): void {
    this.update({ certificates: this.cv().certificates.filter((_, index) => index !== i) });
  }
  save(): void {
    this.service.save(this.cv());
    this.editing = false;
    this.http.patch<Partial<CvProfile>>(
      `${environment.apiUrl}/profiles/me`,
      { experience: this.profile.experience, headline: this.profile.headline },
      { headers: this.headers() },
    ).subscribe({
      next: (profile) => {
        this.profile = { ...this.profile, ...profile };
        this.notice = 'Your CV has been saved.';
      },
      error: () => {
        this.notice = 'Your CV is saved locally. Your experience will sync when the API is available.';
      },
    });
  }
  downloadResume(): void { window.print(); }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
