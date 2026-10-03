import { Component } from '@angular/core';
import { CvEducation, CvCertificate, CvProject, CvService } from '../../core/cv.service';
@Component({ selector: 'app-cv-page', standalone: false, templateUrl: './cv.page.html' })
export class CvPage {
  readonly cv;
  notice = '';
  newProject: CvProject = { title: '', description: '', link: '' };
  newEducation: CvEducation = { school: '', degree: '', period: '' };
  newCertificate: CvCertificate = { name: '', issuer: '', year: '' };
  constructor(private readonly service: CvService) {
    this.cv = service.cv;
  }
  update(partial: object): void {
    this.service.cv.update((value) => ({ ...value, ...partial }));
  }
  addProject(): void {
    if (!this.newProject.title.trim()) return;
    this.update({ projects: [...this.cv().projects, { ...this.newProject }] });
    this.newProject = { title: '', description: '', link: '' };
  }
  removeProject(i: number): void {
    this.update({ projects: this.cv().projects.filter((_, index) => index !== i) });
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
    this.notice = 'Your CV has been saved.';
  }
}
