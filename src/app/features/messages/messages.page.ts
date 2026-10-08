import { ChangeDetectorRef, Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { MessagesSocketService } from '../../core/messages-socket.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-messages-page',
  standalone: false,
  templateUrl: './messages.page.html',
})
export class MessagesPage {
  conversations: any[] = [];
  selected: any = null;
  text = '';
  error = '';
  private readonly socketSubscription: Subscription;
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    socket: MessagesSocketService,
  ) {
    this.load();
    this.socketSubscription = socket.updates().subscribe(() => this.load());
  }
  ngOnDestroy(): void { this.socketSubscription.unsubscribe(); }
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
    this.http
      .post(
        `${environment.apiUrl}/messages/conversation/${conversation._id}/read`,
        {},
        { headers: this.headers() },
      )
      .subscribe({
        next: (updated) => {
          this.selected = updated;
          const index = this.conversations.findIndex((item) => item._id === conversation._id);
          if (index >= 0) this.conversations[index] = updated;
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
    const lastSeen = conversation?.userId?.lastSeen;
    return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
  }
  load() {
    this.http
      .get<any>(`${environment.apiUrl}/messages/mine`, { headers: this.headers() })
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response)
            ? response
            : (response.conversations ?? response.data ?? []);
          this.error = '';
          this.conversations = [...items];
          this.selected = this.selected
            ? (items.find((item: any) => item._id === this.selected._id) ?? items[0])
            : items[0];
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
