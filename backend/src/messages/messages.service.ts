import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { InjectConnection } from '@nestjs/mongoose';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Conversation, ConversationDocument } from './message.schema';
import { User, UserDocument } from '../users/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
type UploadedMessageFile = { size: number; mimetype: string; originalname: string; buffer: Buffer };

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversations: Model<ConversationDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly notifications: NotificationsService,
  ) {}
  async setActiveStatus(userId: string, activeStatus: boolean) {
    await this.users.updateOne(
      { _id: userId },
      {
        $set: {
          activeStatus,
          isOnline: activeStatus,
          ...(activeStatus ? {} : { lastSeen: new Date() }),
        },
      },
    );
    return { activeStatus };
  }
  private bucket() {
    if (!this.connection.db) throw new BadRequestException('File storage is unavailable.');
    return new GridFSBucket(this.connection.db, { bucketName: 'messageAttachments' });
  }
  async uploadAttachment(
    userId: string,
    pageId: string,
    projectId: string,
    file: UploadedMessageFile,
    recipientUserId?: string,
  ) {
    if (
      !file ||
      file.size > 10 * 1024 * 1024 ||
      !(file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf')
    )
      throw new BadRequestException('Upload an image or PDF up to 10 MB.');
    if (file.mimetype.startsWith('image/') && !/^image\/(png|jpeg|gif|webp)$/.test(file.mimetype))
      throw new BadRequestException('Unsupported image type.');
    const bytes = file.buffer;
    const validSignature =
      file.mimetype === 'application/pdf'
        ? bytes.subarray(0, 5).toString() === '%PDF-'
        : file.mimetype === 'image/png'
          ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.mimetype === 'image/jpeg'
            ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
            : file.mimetype === 'image/gif'
              ? ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())
              : file.mimetype === 'image/webp'
                ? bytes.subarray(0, 4).toString() === 'RIFF' &&
                  bytes.subarray(8, 12).toString() === 'WEBP'
                : false;
    if (!validSignature)
      throw new BadRequestException('File content does not match its image or PDF type.');
    const page = await this.companies.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found.');
    const isMember =
      String(page.ownerId) === userId ||
      page.employeeIds.some((id) => String(id) === userId) ||
      (page.employees ?? []).some((employee: any) => String(employee.userId) === userId);
    const recipient = recipientUserId || userId;
    if (!isMember && recipient !== userId) throw new NotFoundException('Conversation not found.');
    const normalizedProjectId = ['none', 'undefined', 'null', ''].includes(projectId)
      ? undefined
      : projectId;
    const conversation =
      (await this.conversations.findOne({
        pageId,
        ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
        userId: recipient,
      })) ??
      (await this.conversations.create({
        pageId,
        userId: recipient,
        ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
        messages: [],
      }));
    const fileId = new Types.ObjectId();
    const bucket = this.bucket();
    await new Promise<void>((resolve, reject) => {
      const stream = bucket.openUploadStreamWithId(fileId, file.originalname, {
        contentType: file.mimetype,
        metadata: { conversationId: conversation.id },
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve());
      stream.end(file.buffer);
    });
    conversation.messages.push({
      senderId: userId as any,
      text: '',
      attachment: { fileId, filename: file.originalname, mimeType: file.mimetype, size: file.size },
    } as any);
    await conversation.save();
    return conversation.populate('messages.senderId', 'name email');
  }
  async downloadAttachment(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Attachment not found.');
    const bucket = this.bucket();
    const fileId = new Types.ObjectId(id);
    const files = await bucket.find({ _id: fileId }).toArray();
    const file = files[0];
    if (!file) throw new NotFoundException('Attachment not found.');
    const conversation = await this.conversations
      .findOne({ 'messages.attachment.fileId': fileId })
      .lean();
    if (!conversation) throw new NotFoundException('Attachment not found.');
    const page = await this.companies.findById(conversation.pageId).lean();
    const member =
      !!page &&
      (String(page.ownerId) === userId ||
        page.employeeIds.some((employee) => String(employee) === userId));
    if (!member && String(conversation.userId) !== userId)
      throw new NotFoundException('Attachment not found.');
    return {
      filename: file.filename,
      mimeType: file.contentType || 'application/octet-stream',
      stream: bucket.openDownloadStream(fileId),
    };
  }
  async listMine(userId: string) {
    const conversations = await this.conversations.find({}).lean();
    // A page inbox is visible to its owner and to users added to the page.
    // Conversations store the matched user's id in `userId`, so checking only
    // that field would hide messages from the page owner/employee.
    const ownedPages = await this.companies
      .find({
        $or: [{ ownerId: userId }, { employeeIds: userId }, { 'employees.userId': userId }],
      })
      .select('_id')
      .lean();
    const ownedPageIds = new Set(ownedPages.map((page) => String(page._id)));
    const matches = conversations.filter((conversation: any) => {
      const current = String(userId);
      // The two valid inbox relationships are explicit:
      // - the user contacted the page (`userId`)
      // - the user owns/works on the page (`pageId`)
      return (
        ownedPageIds.has(String(conversation.pageId ?? '')) ||
        String(conversation.userId ?? '') === current
      );
    });
    const results = await this.conversations
      .find({ _id: { $in: matches.map((conversation) => conversation._id) } })
      .populate('userId', 'name email lastSeen activeStatus isOnline')
      .populate('pageId', 'name description location logo')
      .populate('messages.senderId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
    const pageIds = [
      ...new Set(
        results.map((conversation: any) => String(conversation.pageId?._id ?? conversation.pageId)),
      ),
    ]
      .filter(Types.ObjectId.isValid)
      .map((id) => new Types.ObjectId(id));
    const pages = await this.companies
      .find({ _id: { $in: pageIds } })
      .select('_id ownerId employeeIds employees.userId')
      .lean();
    const pageMap = new Map(pages.map((page: any) => [String(page._id), page]));
    const memberIds = [
      ...new Set(
        pages.flatMap((page: any) => [
          String(page.ownerId),
          ...(page.employeeIds ?? []).map(String),
          ...(page.employees ?? []).map((employee: any) => String(employee.userId)),
        ]),
      ),
    ]
      .filter(Types.ObjectId.isValid)
      .map((id) => new Types.ObjectId(id));
    const onlineUsers = await this.users
      .find({ _id: { $in: memberIds }, activeStatus: true, isOnline: true })
      .select('_id')
      .lean();
    const onlineIds = new Set(onlineUsers.map((item: any) => String(item._id)));
    return results.map((conversation: any) => {
      const pageId = String(conversation.pageId?._id ?? conversation.pageId);
      const page: any = pageMap.get(pageId);
      const members = page
        ? [
            String(page.ownerId),
            ...(page.employeeIds ?? []).map(String),
            ...(page.employees ?? []).map((employee: any) => String(employee.userId)),
          ]
        : [];
      return { ...conversation, pageOnline: members.some((memberId) => onlineIds.has(memberId)) };
    });
  }
  async listForPage(userId: string, pageId: string) {
    const conversations = await this.listMine(userId);
    return conversations.filter(
      (conversation: any) => String(conversation.pageId?._id ?? conversation.pageId) === pageId,
    );
  }
  async listForProject(userId: string, projectId: string) {
    const conversations = await this.listMine(userId);
    return conversations.filter(
      (conversation: any) =>
        String(conversation.projectId?._id ?? conversation.projectId) === projectId,
    );
  }
  async list(userId: string, pageId: string, projectId?: string) {
    const conversation = await this.findAccessible(userId, pageId, projectId);
    if (conversation) await this.markRead(conversation, userId);
    return conversation?.populate([
      { path: 'userId', select: 'name email lastSeen activeStatus isOnline' },
      { path: 'pageId', select: 'name description location logo' },
      { path: 'messages.senderId', select: 'name email' },
    ]);
  }
  async markReadById(userId: string, id: string) {
    const conversation = await this.conversations.findById(id);
    if (!conversation) throw new NotFoundException('Conversation not found.');
    await this.markRead(conversation, userId);
    return conversation.populate([
      { path: 'userId', select: 'name email lastSeen activeStatus isOnline' },
      { path: 'pageId', select: 'name description location logo' },
      { path: 'messages.senderId', select: 'name email' },
    ]);
  }
  private async markRead(conversation: ConversationDocument, userId: string) {
    let changed = false;
    conversation.messages.forEach((message: any) => {
      if (String(message.senderId) !== String(userId) && !message.readAt) {
        message.readAt = new Date();
        changed = true;
      }
    });
    if (changed) await conversation.save();
  }
  async send(
    userId: string,
    pageId: string,
    text: string,
    projectId?: string,
    recipientUserId?: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Message text is required.');
    const page = await this.companies.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found.');
    const isPageMember =
      page.ownerId.toString() === userId ||
      page.employeeIds.some((id) => id.toString() === userId) ||
      (page.employees ?? []).some((employee) => employee.userId.toString() === userId);
    const recipient = recipientUserId || userId;
    if (!isPageMember && recipient !== userId)
      throw new NotFoundException('Conversation not found.');
    const normalizedProjectId = ['none', 'undefined', 'null', ''].includes(projectId ?? '')
      ? undefined
      : projectId;
    const conversation =
      (await this.conversations.findOne({
        pageId,
        ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
        userId: recipient,
      })) ??
      (await this.conversations.create({
        pageId,
        userId: recipient,
        ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
        messages: [],
      }));
    conversation.messages.push({ senderId: userId as any, text: text.trim() });
    await conversation.save();
    await this.notifications
      .message(page._id, userId, recipient, conversation._id, text.trim())
      .catch(() => undefined);
    return conversation.populate('messages.senderId', 'name email');
  }
  private async findAccessible(
    userId: string,
    pageId: string,
    projectId?: string,
  ): Promise<ConversationDocument | null> {
    const page = await this.companies.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found.');
    const normalizedProjectId = ['none', 'undefined', 'null', ''].includes(projectId ?? '')
      ? undefined
      : projectId;
    return this.conversations.findOne({
      pageId,
      ...(normalizedProjectId ? { projectId: normalizedProjectId } : {}),
      $or: [{ userId }, { pageId }],
    });
  }
}
