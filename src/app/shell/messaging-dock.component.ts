import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthUser, AuthService } from '../core/auth.service';
import { MessagesSocketService } from '../core/messages-socket.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-messaging-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messaging-dock.component.html',
})
export class MessagingDockComponent implements OnInit, OnDestroy {
  @Input() user: AuthUser | null = null;

  open = false;
  loading = false;
  conversations: any[] = [];
  private socketSubscription?: Subscription;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly socket: MessagesSocketService,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.socketSubscription = this.socket.updates().subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) this.load();
  }

  load(): void {
    if (!this.auth.token) return;
    this.loading = true;
    this.http
      .get<any>(`${environment.apiUrl}/messages/mine`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` }),
      })
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response)
            ? response
            : (response?.conversations ?? response?.data ?? []);
          this.conversations = [...items]
            .sort(
              (a, b) =>
                new Date(b.updatedAt ?? b.messages?.at(-1)?.createdAt ?? 0).getTime() -
                new Date(a.updatedAt ?? a.messages?.at(-1)?.createdAt ?? 0).getTime(),
            )
            .slice(0, 6);
          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.changeDetector.markForCheck();
        },
      });
  }

  conversationTitle(conversation: any): string {
    const currentId = this.auth.readUser()?.id;
    const participantId = conversation?.userId?._id ?? conversation?.userId;
    if (currentId && String(currentId) === String(participantId)) {
      return conversation?.pageId?.name || 'Company conversation';
    }
    return (
      conversation?.userId?.name ||
      conversation?.userId?.email ||
      conversation?.pageId?.name ||
      'Conversation'
    );
  }

  conversationPhoto(conversation: any): string | undefined {
    const currentId = this.auth.readUser()?.id;
    const participantId = conversation?.userId?._id ?? conversation?.userId;
    return currentId && String(currentId) === String(participantId)
      ? conversation?.pageId?.logo
      : conversation?.userId?.photo;
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  lastMessage(conversation: any): any {
    return conversation?.messages?.at(-1);
  }

  lastMessagePreview(conversation: any): string {
    const message = this.lastMessage(conversation);
    if (!message) return 'Start a conversation';
    const senderId = message.senderId?._id ?? message.senderId;
    const author = String(senderId) === String(this.auth.readUser()?.id)
      ? 'You'
      : message.senderId?.name || 'New message';
    const text = message.text || message.attachment?.filename || 'Attachment';
    return `${author}: ${text}`;
  }

  unreadCount(): number {
    return this.conversations.reduce(
      (count, conversation) =>
        count + this.unreadFor(conversation),
      0,
    );
  }

  unreadFor(conversation: any): number {
    const currentId = this.auth.readUser()?.id;
    return (conversation.messages ?? []).filter((message: any) => {
      const senderId = message.senderId?._id ?? message.senderId;
      return String(senderId) !== String(currentId) && !message.readAt;
    }).length;
  }

  openConversation(conversation: any): void {
    this.open = false;
    void this.router.navigate(['/messages'], {
      queryParams: { conversation: conversation._id },
    });
  }

  openInbox(): void {
    this.open = false;
    void this.router.navigate(['/messages']);
  }
}
