import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MessagesSocketService {
  private readonly socket: Socket;
  constructor(auth: AuthService) {
    this.socket = io(environment.socketUrl || undefined, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token: auth.token ?? '' },
    });
    if (auth.token) this.socket.connect();
  }
  connect(token: string) {
    this.socket.auth = { token };
    this.socket.connect();
  }
  disconnect() {
    this.socket.disconnect();
  }

  updates(): Observable<any> {
    return new Observable((subscriber) => {
      const handler = (conversation: any) => subscriber.next(conversation);
      this.socket.on('conversation:updated', handler);
      return () => this.socket.off('conversation:updated', handler);
    });
  }
  presence(): Observable<any> {
    return new Observable((subscriber) => {
      const handler = (event: any) => subscriber.next(event);
      this.socket.on('presence:changed', handler);
      return () => this.socket.off('presence:changed', handler);
    });
  }
}
