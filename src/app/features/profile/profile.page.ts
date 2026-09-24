import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Branches } from '../../branches';
import { AuthService } from '../../core/auth.service';

type Profile = {
  name: string;
  email: string;
  headline: string;
  location: string;
  branch: Branches;
  about: string;
  skills: string;
  website: string;
  experience: string;
  education: string;
  photo: string;
};

@Component({
  selector: 'app-profile-page',
  standalone: false,
  templateUrl: './profile.page.html',
})
export class ProfilePage implements OnInit {
  readonly branches = Object.values(Branches).filter((branch) => branch !== Branches.All);
  notice = '';
  pictureError = '';
  profile = this.loadProfile();

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.http
      .get<Partial<Profile>>('http://localhost:3000/profiles/me', { headers: this.headers() })
      .subscribe({
        next: (profile) => {
          this.profile = { ...this.profile, ...profile };
        },
        error: () => {
          this.notice = 'Could not load your profile. Check that the API is running.';
        },
      });
  }

  get initials(): string {
    return this.profile.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  onPictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.pictureError = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.pictureError = 'Choose an image file.';
      input.value = '';
      return;
    }
    if (file.size > 1_500_000) {
      this.pictureError = 'Choose an image smaller than 1.5 MB.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profile.photo = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.onerror = () => {
      this.pictureError = 'This image could not be opened. Try another one.';
    };
    reader.readAsDataURL(file);
  }

  removePicture(): void {
    this.profile.photo = '';
    this.pictureError = '';
  }

  saveProfile(): void {
    const { email: _email, ...editableProfile } = this.profile;
    this.http
      .patch<Partial<Profile>>('http://localhost:3000/profiles/me', editableProfile, {
        headers: this.headers(),
      })
      .subscribe({
        next: (profile) => {
          this.profile = { ...this.profile, ...profile };
          const user = this.auth.readUser();
          if (user) {
            this.auth.saveUser({ ...user, name: this.profile.name, photo: this.profile.photo });
            window.dispatchEvent(new Event('career-space-profile-updated'));
          }
          this.notice = 'Your profile has been saved.';
        },
        error: (error: HttpErrorResponse) => {
          this.notice = error.error?.message || 'Your profile could not be saved.';
        },
      });
  }

  branchLabel(branch: Branches): string {
    return branch.replaceAll('_', ' ');
  }

  private loadProfile(): Profile {
    const defaultProfile: Profile = {
      name: 'Your Name',
      email: '',
      headline: '',
      location: '',
      branch: Branches.Other,
      about: '',
      skills: '',
      website: '',
      experience: '',
      education: '',
      photo: '',
    };
    try {
      const user = JSON.parse(localStorage.getItem('career-space-user') || '{}') as {
        name?: string;
        email?: string;
      };
      const saved = JSON.parse(
        localStorage.getItem('career-space-profile') || '{}',
      ) as Partial<Profile>;
      return {
        ...defaultProfile,
        name: user.name || defaultProfile.name,
        email: user.email || '',
        ...saved,
      };
    } catch {
      return defaultProfile;
    }
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
}
