import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessagesSocketService } from '../../core/messages-socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  template: `<section class="mx-auto max-w-4xl px-5 py-8">
    <a class="text-sm text-[#0a66c2]" href="/projects">← Back to projects</a>
    <h1 class="mt-5 text-3xl font-semibold">Project details</h1>
    <p class="mt-2 text-sm text-stone-500">Project {{ id }}</p>
    <div class="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 class="text-xl font-semibold">Project conversations</h2>
      <p class="mt-1 text-sm text-stone-500">
        People and companies contacted about this project, with their current status.
      </p>
      @if (!conversations.length) {
        <p class="mt-4 text-sm text-stone-500">No users have been contacted yet.</p>
      }
      @for (conversation of conversations; track conversation._id) {
        <a
          [routerLink]="['/companies', conversation.pageId?._id ?? conversation.pageId, 'messages']"
          class="relative mt-3 block rounded-xl border border-stone-200 p-4 transition hover:shadow-md"
          ><div class="flex items-center gap-3">
            <div
              class="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff] font-semibold text-[#0a66c2]"
            >
              {{ conversationTitle(conversation).slice(0, 1).toUpperCase() }}
              <i
                class="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white"
                [class.bg-green-500]="participantOnline(conversation)"
                [class.bg-gray-400]="!participantOnline(conversation)"
                [attr.title]="participantStatus(conversation)"
              ></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium">{{ conversationTitle(conversation) }}</div>
              <div
                class="mt-0.5 text-xs"
                [class.text-green-600]="participantOnline(conversation)"
                [class.text-gray-500]="!participantOnline(conversation)"
              >
                {{ participantStatus(conversation) }}
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
export class ProjectDetailPage implements OnChanges, OnDestroy {
  @Input() projectId = '';
  @Input() pageId = '';
  id = '';
  conversations: any[] = [];
  private readonly presenceSubscription: Subscription;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    socket: MessagesSocketService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {
    this.presenceSubscription = socket.presence().subscribe((event) => {
      for (const conversation of this.conversations) {
        if (
          event.userId &&
          String(conversation.userId?._id ?? conversation.userId) === String(event.userId) &&
          typeof conversation.userId === 'object'
        ) {
          conversation.userId.isOnline = event.online && event.active !== false;
          conversation.userId.activeStatus = event.active !== false;
          if (event.lastSeen) conversation.userId.lastSeen = event.lastSeen;
        }
        if (
          event.companyId &&
          String(conversation.pageId?._id ?? conversation.pageId) === String(event.companyId)
        ) {
          conversation.pageOnline = event.online;
        }
      }
      this.changeDetector.detectChanges();
    });
    this.load();
  }
  ngOnDestroy(): void {
    this.presenceSubscription.unsubscribe();
  }
  conversationTitle(conversation: any): string {
    const currentId = this.auth.readUser()?.id;
    const participantId = conversation?.userId?._id ?? conversation?.userId;
    if (currentId && String(currentId) === String(participantId))
      return conversation?.pageId?.name || 'Company';
    return (
      conversation?.userId?.name ||
      conversation?.userId?.email ||
      conversation?.pageId?.name ||
      'User'
    );
  }
  participantOnline(conversation: any): boolean {
    const currentId = this.auth.readUser()?.id;
    const participantId = conversation?.userId?._id ?? conversation?.userId;
    if (currentId && String(currentId) === String(participantId))
      return conversation?.pageOnline === true;
    return conversation?.userId?.activeStatus !== false && conversation?.userId?.isOnline === true;
  }
  participantStatus(conversation: any): string {
    const currentId = this.auth.readUser()?.id;
    const participantId = conversation?.userId?._id ?? conversation?.userId;
    if (currentId && String(currentId) === String(participantId))
      return conversation?.pageOnline ? 'Online' : 'Offline';
    const user = conversation?.userId;
    if (user?.activeStatus === false) return 'Offline';
    if (user?.isOnline === true) return 'Online';
    if (!user?.lastSeen) return 'Offline';
    const date = new Date(user.lastSeen);
    return Number.isNaN(date.getTime())
      ? 'Offline'
      : `Last seen ${date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
  }
  ngOnChanges(): void {
    if (this.projectId) this.load();
  }
  private load(): void {
    this.id =
      this.projectId ||
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.paramMap.get('projectId') ||
      '';
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
      .subscribe({
        next: (items) =>
          (this.conversations = (items ?? []).filter(
            (item) => String(item.projectId?._id ?? item.projectId) === this.id,
          )),
      });
  }
}
