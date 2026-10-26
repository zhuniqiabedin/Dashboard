import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { TokenService } from '../auth/token.service';
import { Company, CompanyDocument } from '../companies/company.schema';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  constructor(
    private readonly tokens: TokenService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
  ) {}
  async afterInit() {
    await this.users.updateMany(
      { isOnline: true },
      { $set: { isOnline: false, lastSeen: new Date() } },
    );
  }
  async handleConnection(client: Socket) {
    try {
      const token = String(client.handshake.auth?.token || '');
      const identity = this.tokens.verify(token);
      const user = await this.users.findById(identity.sub).select('activeStatus').lean();
      if (!user || !user.activeStatus) {
        client.disconnect(true);
        return;
      }
      client.data.userId = identity.sub;
      await client.join(`user:${identity.sub}`);
      const pages = await this.companies
        .find({
          $or: [
            { ownerId: identity.sub },
            { employeeIds: identity.sub },
            { 'employees.userId': identity.sub },
          ],
        })
        .select('_id')
        .lean();
      await client.join(pages.map((page) => `company:${page._id}`));
      await this.users.updateOne(
        { _id: identity.sub, activeStatus: true },
        { $set: { isOnline: true } },
      );
      await this.emitPresence(identity.sub, true);
    } catch {
      client.disconnect(true);
    }
  }
  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;
    const remaining = await this.server.in(`user:${userId}`).fetchSockets();
    if (remaining.length) return;
    await this.users.updateOne(
      { _id: userId },
      { $set: { isOnline: false, lastSeen: new Date() } },
    );
    await this.emitPresence(userId, false);
  }

  conversationUpdated(conversation: any) {
    const pageId = String(conversation?.pageId?._id ?? conversation?.pageId ?? '');
    const userId = String(conversation?.userId?._id ?? conversation?.userId ?? '');
    this.server
      .to(`company:${pageId}`)
      .to(`user:${userId}`)
      .emit('conversation:updated', conversation);
  }
  async presenceChanged(userId: string, active: boolean) {
    const sockets = active ? await this.server.in(`user:${userId}`).fetchSockets() : [];
    const online = active && sockets.length > 0;
    await this.users.updateOne(
      { _id: userId },
      {
        $set: {
          activeStatus: active,
          isOnline: online,
          ...(!online ? { lastSeen: new Date() } : {}),
        },
      },
    );
    await this.emitPresence(userId, online, active);
  }
  private async emitPresence(userId: string, online: boolean, active = true) {
    const user = online ? null : await this.users.findById(userId).select('lastSeen').lean();
    this.server.emit('presence:changed', {
      userId,
      online,
      active,
      lastSeen: user?.lastSeen ?? null,
    });
    const companies = await this.companies
      .find({ $or: [{ ownerId: userId }, { employeeIds: userId }, { 'employees.userId': userId }] })
      .select('_id ownerId employeeIds employees.userId')
      .lean();
    for (const company of companies) {
      const members = [
        ...new Set([
          String(company.ownerId),
          ...(company.employeeIds ?? []).map(String),
          ...(company.employees ?? []).map((employee: any) => String(employee.userId)),
        ]),
      ];
      const activeMembers = await this.users.countDocuments({
        _id: { $in: members },
        activeStatus: true,
        isOnline: true,
      });
      this.server.emit('presence:changed', {
        companyId: String(company._id),
        online: activeMembers > 0,
      });
    }
  }
}
