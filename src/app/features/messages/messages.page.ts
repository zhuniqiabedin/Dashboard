import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { MessagesSocketService } from '../../core/messages-socket.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-messages-page',
  standalone: false,
  host: { class: 'block h-full min-h-0' },
  templateUrl: './messages.page.html',
})
export class MessagesPage implements AfterViewChecked {
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;
  conversations: any[] = [];
  selected: any = null;
  text = '';
  error = '';
  query = '';
  filter = 'all';
  activeStatus = true;
  private requestedConversationId: string | null;
  private readonly socketSubscription: Subscription;
  private scrollToLatestMessage = false;
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly socket: MessagesSocketService,
    route: ActivatedRoute,
  ) {
    this.requestedConversationId = route.snapshot.queryParamMap.get('conversation');
    this.load();
    this.socketSubscription = socket.updates().subscribe(() => this.load());
    socket.presence().subscribe((event) => {
      for (const item of this.conversations) {
        if (event.companyId && String(item.pageId?._id ?? item.pageId) === String(event.companyId))
          item.pageOnline = event.online;
        if (
          event.userId &&
          String(item.userId?._id ?? item.userId) === String(event.userId) &&
          item.userId &&
          typeof item.userId === 'object'
        ) {
          item.userId.isOnline = event.online && event.active !== false;
          item.userId.activeStatus = event.active !== false;
          if (event.lastSeen) item.userId.lastSeen = event.lastSeen;
        }
      }
      this.changeDetector.detectChanges();
    });
  }
  get filteredConversations(): any[] {
    return this.conversations.filter((conversation) => {
      const last = conversation.messages?.at(-1);
      const unread = (conversation.messages || []).some(
        (message: any) => !this.isOwnMessage(message) && !message.readAt,
      );
      return (
        (this.filter !== 'unread' || unread) &&
        this.conversationTitle(conversation).toLowerCase().includes(this.query.toLowerCase())
      );
    });
  }
  unreadCount(conversation: any): number {
    return (conversation.messages || []).filter(
      (message: any) => !this.isOwnMessage(message) && !message.readAt,
    ).length;
  }
  setActiveStatus(active: boolean) {
    this.http
      .patch(`${environment.apiUrl}/messages/presence`, { active }, { headers: this.headers() })
      .subscribe(() => {
        this.activeStatus = active;
      });
  }
  chooseFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.selected) return;
    if (
      file.size > 10 * 1024 * 1024 ||
      !(file.type.startsWith('image/') || file.type === 'application/pdf')
    ) {
      this.error = 'Choose an image or PDF up to 10 MB.';
      return;
    }
    const page = this.selected.pageId?._id ?? this.selected.pageId;
    const project = this.selected.projectId?._id ?? this.selected.projectId ?? 'none';
    const data = new FormData();
    data.append('file', file);
    this.http
      .post(`${environment.apiUrl}/messages/${page}/${project}/attachment`, data, {
        headers: this.headers(),
      })
      .subscribe({
        next: () => this.load(),
        error: (e) => {
          this.error = e.error?.message || 'Attachment upload failed.';
        },
      });
    (event.target as HTMLInputElement).value = '';
  }
  download(message: any) {
    const id = message.attachment?.fileId;
    if (!id) return;
    this.http
      .get(`${environment.apiUrl}/messages/attachment/${id}`, {
        headers: this.headers(),
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = message.attachment.filename;
        anchor.click();
        URL.revokeObjectURL(url);
      });
  }
  ngOnDestroy(): void {
    this.socketSubscription.unsubscribe();
  }
  ngAfterViewChecked(): void {
    if (!this.scrollToLatestMessage || !this.messageList) return;
    const element = this.messageList.nativeElement;
    element.scrollTop = element.scrollHeight;
    this.scrollToLatestMessage = false;
  }
  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }
  conversationTitle(conversation: any): string {
    const currentId = this.auth.readUser()?.id;
    const userId = conversation?.userId?._id ?? conversation?.userId;
    // The conversation user is the contacted user. Page members should see
    // that person's name; the contacted user should see the page name.
    if (currentId && String(currentId) === String(userId)) {
      return conversation?.pageId?.name || 'Page conversation';
    }
    return (
      conversation?.userId?.name ||
      conversation?.userId?.email ||
      conversation?.pageId?.name ||
      'Conversation'
    );
  }
  selectConversation(conversation: any): void {
    this.selected = conversation;
    this.scrollToLatestMessage = true;
    this.http
      .post(
        `${environment.apiUrl}/messages/conversation/${conversation._id}/read`,
        {},
        { headers: this.headers() },
      )
      .subscribe({
        next: (updated) => {
          // Keep populated participant/page data from the inbox row while replacing
          // the message list with the read response.
          this.selected = { ...conversation, ...updated };
          this.scrollToLatestMessage = true;
          const index = this.conversations.findIndex((item) => item._id === conversation._id);
          if (index >= 0) this.conversations[index] = { ...conversation, ...updated };
        },
      });
  }
  messageDate(message: any): string {
    return message?.createdAt ? new Date(message.createdAt).toLocaleString() : '';
  }
  isOwnMessage(message: any): boolean {
    const currentId = this.auth.readUser()?.id;
    const senderId = message?.senderId?._id ?? message?.senderId;
    return !!currentId && String(currentId) === String(senderId);
  }
  participantOnline(conversation: any): boolean {
    const currentId = this.auth.readUser()?.id;
    const conversationUserId = conversation?.userId?._id ?? conversation?.userId;
    if (currentId && String(currentId) === String(conversationUserId))
      return conversation?.pageOnline === true;
    return conversation?.userId?.activeStatus !== false && conversation?.userId?.isOnline === true;
  }
  participantStatus(conversation: any): string {
    const currentId = this.auth.readUser()?.id;
    const conversationUserId = conversation?.userId?._id ?? conversation?.userId;
    if (currentId && String(currentId) === String(conversationUserId)) {
      return conversation?.pageOnline ? 'Online' : 'Offline';
    }
    const user = conversation?.userId;
    if (user?.activeStatus === false) return 'Offline';
    if (user?.isOnline === true) return 'Online';
    return user?.lastSeen ? `Last seen ${this.lastSeenDate(user.lastSeen)}` : 'Offline';
  }
  lastSeenDate(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'a while ago'
      : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
  load() {
    this.http
      .get<any>(`${environment.apiUrl}/messages/mine`, { headers: this.headers() })
      .subscribe({
        next: (response) => {
          const previousSelectedId = this.selected?._id;
          const items = Array.isArray(response)
            ? response
            : (response.conversations ?? response.data ?? []);
          this.error = '';
          this.conversations = [...items];
          const requested = this.requestedConversationId
            ? items.find((item: any) => item._id === this.requestedConversationId)
            : null;
          this.selected = requested ?? (this.selected
            ? (items.find((item: any) => item._id === this.selected._id) ?? items[0])
            : items[0]);
          if (requested || !previousSelectedId) this.scrollToLatestMessage = true;
          if (requested) {
            this.requestedConversationId = null;
            this.selectConversation(requested);
          }
          this.changeDetector.detectChanges();
        },
        error: (error) => {
          this.error = error.error?.message || 'Messages could not be loaded.';
          this.changeDetector.detectChanges();
        },
      });
  }
  send() {
    if (!this.selected || !this.text.trim()) return;
    const page = this.selected.pageId?._id ?? this.selected.pageId;
    const project = this.selected.projectId?._id ?? this.selected.projectId;
    this.http
      .post(
        `${environment.apiUrl}/messages/${page}/${project}`,
        { text: this.text.trim() },
        { headers: this.headers() },
      )
      .subscribe(() => {
        this.text = '';
        this.load();
      });
  }
}
