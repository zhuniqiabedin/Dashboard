import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MessagesSocketService {
  private readonly socket: Socket = io(environment.apiUrl, { transports: ['websocket'] });

  updates(): Observable<any> {
    return new Observable((subscriber) => {
      const handler = (conversation: any) => subscriber.next(conversation);
      this.socket.on('conversation:updated', handler);
      return () => this.socket.off('conversation:updated', handler);
    });
  }
}
