import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: 'http://localhost:4200', credentials: true } })
export class MessagesGateway {
  @WebSocketServer() server!: Server;

  conversationUpdated(conversation: unknown) {
    this.server.emit('conversation:updated', conversation);
  }
}
