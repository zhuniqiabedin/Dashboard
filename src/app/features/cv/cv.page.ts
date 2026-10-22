import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CvEducation, CvCertificate, CvProject, CvService } from '../../core/cv.service';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { Subscription, switchMap } from 'rxjs';
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
export class CvPage implements OnInit, OnDestroy {
  readonly cv;
  notice = '';
  templates: { id: string; name: string; description: string; accent: string }[] = [];
  selectedTemplate = 'modern';
  downloading = false;
  previewOpen = false;
  previewLoading = false;
  previewRequested = false;
  previewError = '';
  previewSrc: SafeResourceUrl | null = null;
  private previewUrl = '';
  private previewRequest?: Subscription;
  editing = false;
  editingProjectIndex: number | null = null;
  projectDraft: CvProject | null = null;
  profile: CvProfile = {
    name: 'Your Name',
    email: '',
    headline: '',
    location: '',
    about: '',
    website: '',
    experience: '',
    photo: '',
  };
  newProject: CvProject = { title: '', description: '', link: '', skills: [] };
  newEducation: CvEducation = { school: '', degree: '', period: '' };
  newCertificate: CvCertificate = { name: '', issuer: '', year: '' };
  constructor(
    private readonly service: CvService,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly sanitizer: DomSanitizer,
  ) {
    this.cv = service.cv;
  }
  selectTemplate(templateId: string): void {
    this.selectedTemplate = templateId;
    this.previewOpen = true;
    this.previewRequested = false;
    this.previewError = '';
    this.previewRequest?.unsubscribe();
    this.releasePreviewUrl();
    this.previewSrc = null;
  }
  loadPreview(): void {
    const templateId = this.selectedTemplate;
    this.previewRequested = true;
    this.previewLoading = true;
    this.previewError = '';
    this.previewRequest?.unsubscribe();
    this.releasePreviewUrl();
    this.previewSrc = null;
    this.previewRequest = this.persistCurrentCv()
      .pipe(
        switchMap(() =>
          this.http.get(`${environment.apiUrl}/cv/preview`, {
            headers: this.headers(),
            params: { template: templateId },
            responseType: 'blob',
          }),
        ),
      )
      .subscribe({
        next: (blob) => {
          if (!this.previewOpen) return;
          this.previewUrl = URL.createObjectURL(blob);
          this.previewSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
          this.previewLoading = false;
        },
        error: (error) => {
          this.previewLoading = false;
          this.previewError =
            error.error?.message || 'Could not create the CV preview. Please try again.';
        },
      });
  }
  closePreview(): void {
    this.previewOpen = false;
    this.previewLoading = false;
    this.previewRequested = false;
    this.previewRequest?.unsubscribe();
    this.previewRequest = undefined;
    this.releasePreviewUrl();
    this.previewSrc = null;
  }
  get previewDocumentUrl(): string | null {
    return this.previewUrl || null;
  }
  ngOnDestroy(): void {
    this.closePreview();
  }
  ngOnInit(): void {
    const user = this.auth.readUser();
    this.profile.name = user?.name || this.profile.name;
    this.profile.email = user?.email || '';
    this.http
      .get<Partial<CvProfile>>(`${environment.apiUrl}/profiles/me`, { headers: this.headers() })
      .subscribe({ next: (profile) => (this.profile = { ...this.profile, ...profile }) });
    this.http
      .get<typeof this.templates>(`${environment.apiUrl}/cv/templates`, { headers: this.headers() })
      .subscribe({
        next: (templates) => (this.templates = templates),
        error: () => (this.notice = 'Could not load CV designs. Check that the API is running.'),
      });
  }
  get initials(): string {
    return this.profile.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
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
    this.editing = false;
    this.service
      .persist(this.cv())
      .pipe(
        switchMap(() =>
          this.http.patch<Partial<CvProfile>>(
            `${environment.apiUrl}/profiles/me`,
            { experience: this.profile.experience, headline: this.profile.headline },
            { headers: this.headers() },
          ),
        ),
      )
      .subscribe({
        next: (profile) => {
          this.profile = { ...this.profile, ...profile };
          this.notice = 'Your CV has been saved.';
        },
        error: () => {
          this.notice = 'Could not save your CV to the server. Your local copy is still available.';
        },
      });
  }
  downloadResume(): void {
    if (this.downloading) return;
    this.downloading = true;
    this.notice = '';
    this.service
      .persist(this.cv())
      .pipe(
        switchMap(() =>
          this.http.patch(
            `${environment.apiUrl}/profiles/me`,
            { experience: this.profile.experience, headline: this.profile.headline },
            { headers: this.headers() },
          ),
        ),
        switchMap(() =>
          this.http.get(`${environment.apiUrl}/cv/pdf`, {
            headers: this.headers(),
            params: { template: this.selectedTemplate },
            responseType: 'blob',
          }),
        ),
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `resume-${this.selectedTemplate}.pdf`;
          anchor.click();
          URL.revokeObjectURL(url);
          this.notice = `${this.selectedTemplate} CV downloaded as PDF.`;
          this.downloading = false;
        },
        error: (error) => {
          this.notice = error.error?.message || 'Could not generate the PDF. Please try again.';
          this.downloading = false;
        },
      });
  }
  private persistCurrentCv() {
    return this.service
      .persist(this.cv())
      .pipe(
        switchMap(() =>
          this.http.patch(
            `${environment.apiUrl}/profiles/me`,
            { experience: this.profile.experience, headline: this.profile.headline },
            { headers: this.headers() },
          ),
        ),
      );
  }
  private releasePreviewUrl(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = '';
  }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
