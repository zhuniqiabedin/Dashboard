import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectsService } from '../../core/projects.service';
import { Branches } from '../../branches';
import { CompaniesService } from '../../core/companies.service';
@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [FormsModule],
  template: ` <section>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="text-[10px] font-semibold tracking-[.16em] text-[#0a66c2]">
          {{ pageId ? 'PAGE WORKSPACE' : 'YOUR WORKSPACE' }}
        </div>
        <h1 class="mt-2 text-3xl font-semibold">{{ pageId ? 'Projects' : 'My projects' }}</h1>
        <p class="mt-2 text-sm text-stone-500">
          {{
            pageId
              ? 'Projects created for this page.'
              : 'Keep your own ideas and work moving forward.'
          }}
        </p>
      </div>
      <button
        class="rounded-xl bg-[#0a66c2] px-4 py-3 text-sm font-medium text-white"
        (click)="dialog = true"
      >
        ＋ New project
      </button>
    </div>
    @if (dialog) {
      <div
        class="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4"
        (click)="dialog = false"
      >
        <form
          class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          (ngSubmit)="save()"
          (click)="$event.stopPropagation()"
        >
          <div class="flex justify-between">
            <h2 class="text-xl font-semibold">New project</h2>
            <button type="button" (click)="dialog = false">×</button>
          </div>
          <div class="mt-5 grid gap-3">
            <input
              class="profile-input"
              [(ngModel)]="title"
              name="title"
              placeholder="Project title"
              required
            /><textarea
              class="profile-input"
              [(ngModel)]="summary"
              name="summary"
              rows="4"
              placeholder="Short description"
              required
            ></textarea>
          </div>
          <button class="mt-5 rounded-xl bg-[#0a66c2] px-5 py-3 text-sm text-white">
            Save project
          </button>
        </form>
      </div>
    }
    <div class="mt-7 grid gap-4 md:grid-cols-2">
      @for (project of projects(); track project.id) {
        <article class="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 class="font-semibold">{{ project.title }}</h2>
          <p class="mt-3 text-sm leading-6 text-stone-500">{{ project.summary }}</p>
          <div class="mt-4 flex justify-between text-xs text-stone-400">
            <span>{{ project.category }}</span
            ><span>{{ project.status }}</span>
          </div>
        </article>
      } @empty {
        <p class="rounded-2xl border border-dashed border-stone-300 p-8 text-sm text-stone-500">
          No projects yet.
        </p>
      }
    </div>
  </section>`,
})
export class ProjectListComponent {
  @Input() pageId = '';
  dialog = false;
  title = '';
  summary = '';
  constructor(
    private readonly service: ProjectsService,
    private readonly companies: CompaniesService,
  ) {}
  get projects(): any {
    return this.pageId ? this.companies.pageProjects : this.service.projects;
  }
  save(): void {
    if (!this.title.trim() || !this.summary.trim()) return;
    if (this.pageId)
      this.companies.createProject({
        pageId: this.pageId,
        title: this.title.trim(),
        summary: this.summary.trim(),
        category: 'Company project',
        branch: Branches.Other,
        startDate: new Date().toISOString(),
      });
    else
      this.service.create({
        title: this.title.trim(),
        summary: this.summary.trim(),
        details: '',
        category: 'Personal project',
        branch: Branches.Other,
        status: 'Planning',
        progress: 0,
        startDate: new Date().toISOString(),
        skills: [],
      });
    this.title = '';
    this.summary = '';
    this.dialog = false;
  }
}
