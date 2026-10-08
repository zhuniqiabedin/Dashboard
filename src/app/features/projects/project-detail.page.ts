import { Component, Input, OnChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  template: `<section class="mx-auto max-w-4xl px-5 py-8">
    <a class="text-sm text-[#0a66c2]" href="/projects">← Back to projects</a>
    <h1 class="mt-5 text-3xl font-semibold">Project details</h1>
    <p class="mt-2 text-sm text-stone-500">Project {{ id }}</p>
    <div class="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 class="text-xl font-semibold">Users contacted by this company</h2>
      <p class="mt-1 text-sm text-stone-500">People this company has contacted for this project.</p>
      @if (!conversations.length) {
        <p class="mt-4 text-sm text-stone-500">No users have been contacted yet.</p>
      }
      @for (conversation of conversations; track conversation._id) {
        <a
          [routerLink]="['/companies', conversation.pageId?._id ?? conversation.pageId, 'messages']"
          class="relative mt-3 block rounded-xl border border-stone-200 p-4 transition hover:shadow-md"
          ><div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-full bg-[#e8f3ff] font-semibold text-[#0a66c2]"
            >
              {{ (conversation.userId?.name || 'U').slice(0, 1).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium">
                {{ conversation.userId?.name || conversation.userId?.email || 'User' }}
              </div>
              <div class="mt-1 truncate text-sm text-stone-600">
                {{ conversation.messages?.[conversation.messages.length - 1]?.text }}
              </div>
              <div class="mt-1 text-xs text-stone-400">
                {{ conversation.updatedAt | date: 'medium' }}
              </div>
            </div>
            @if (conversation.unreadCount) {
              <span
                class="flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white"
                >{{ conversation.unreadCount }}</span
              >
            }
          </div></a
        >
      }
    </div>
  </section>`,
  imports: [DatePipe, RouterLink],
})
export class ProjectDetailPage implements OnChanges {
  @Input() projectId = '';
  @Input() pageId = '';
  id = '';
  conversations: any[] = [];
  constructor(private readonly route: ActivatedRoute, private readonly http: HttpClient, private readonly auth: AuthService) {
    this.load();
  }
  ngOnChanges(): void { if (this.projectId) this.load(); }
  private load(): void {
    this.id = this.projectId || this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('projectId') || '';
    if (!this.id) return;
    this.http
      .get<any[]>(`${environment.apiUrl}/messages/project/${this.id}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({
        next: (items) => {
          if (items?.length || !this.pageId) this.conversations = items ?? [];
          else this.loadCompanyConversations();
        },
        error: () => this.loadCompanyConversations(),
      });
  }
  private loadCompanyConversations(): void {
    if (!this.pageId) return;
    this.http
      .get<any[]>(`${environment.apiUrl}/messages/page/${this.pageId}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }),
      })
      .subscribe({ next: (items) => (this.conversations = (items ?? []).filter((item) => String(item.projectId?._id ?? item.projectId) === this.id)) });
  }
}
