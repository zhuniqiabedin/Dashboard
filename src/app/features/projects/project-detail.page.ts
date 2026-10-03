import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  template: `<section class="mx-auto max-w-4xl px-5 py-8"><a class="text-sm text-[#0a66c2]" href="/projects">← Back to projects</a><h1 class="mt-5 text-3xl font-semibold">Project details</h1><p class="mt-2 text-sm text-stone-500">Project {{ id }}</p><div class="mt-8 rounded-2xl border border-stone-200 bg-white p-6"><h2 class="text-xl font-semibold">Applicants</h2><p class="mt-2 text-sm text-stone-500">Applicants for this project will appear here.</p></div></section>`,
})
export class ProjectDetailPage {
  id = '';
  constructor(route: ActivatedRoute) { this.id = route.snapshot.paramMap.get('id') ?? ''; }
}
