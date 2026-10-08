import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Conversation, ConversationDocument } from './message.schema';

@Injectable()
export class MessagesService {
  constructor(@InjectModel(Conversation.name) private readonly conversations: Model<ConversationDocument>, @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>) {}
  async listMine(userId: string) {
    const conversations = await this.conversations.find({}).lean();
    // A page inbox is visible to its owner and to users added to the page.
    // Conversations store the matched user's id in `userId`, so checking only
    // that field would hide messages from the page owner/employee.
    const ownedPages = await this.companies.find({
      $or: [
        { ownerId: userId },
        { employeeIds: userId },
        { 'employees.userId': userId },
      ],
    }).select('_id').lean();
    const ownedPageIds = new Set(ownedPages.map((page) => String(page._id)));
    const matches = conversations.filter((conversation: any) => {
      const current = String(userId);
      // The two valid inbox relationships are explicit:
      // - the user contacted the page (`userId`)
      // - the user owns/works on the page (`pageId`)
      return ownedPageIds.has(String(conversation.pageId ?? '')) || String(conversation.userId ?? '') === current;
    });
    return this.conversations
      .find({ _id: { $in: matches.map((conversation) => conversation._id) } })
      .populate('userId', 'name email lastSeen')
      .populate('pageId', 'name description location logo')
      .populate('messages.senderId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
  }
  async listForPage(userId: string, pageId: string) {
    const conversations = await this.listMine(userId);
    return conversations.filter((conversation: any) => String(conversation.pageId?._id ?? conversation.pageId) === pageId);
  }
  async listForProject(projectId: string) {
    return this.conversations.find({ projectId })
      .populate('userId', 'name email lastSeen')
      .populate('pageId', 'name')
      .populate('messages.senderId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
  }
  async list(userId: string, pageId: string, projectId?: string) {
    const conversation = await this.findAccessible(userId, pageId, projectId);
    if (conversation) await this.markRead(conversation, userId);
    return conversation?.populate('messages.senderId', 'name email');
  }
  async markReadById(userId: string, id: string) {
    const conversation = await this.conversations.findById(id);
    if (!conversation) throw new NotFoundException('Conversation not found.');
    await this.markRead(conversation, userId);
    return conversation.populate('messages.senderId', 'name email');
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
  async send(userId: string, pageId: string, text: string, projectId?: string, recipientUserId?: string) {
    if (!text?.trim()) throw new BadRequestException('Message text is required.');
    const page = await this.companies.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found.');
    const isPageMember = page.ownerId.toString() === userId || page.employeeIds.some((id) => id.toString() === userId) || (page.employees ?? []).some((employee) => employee.userId.toString() === userId);
    const recipient = recipientUserId || userId;
    if (!isPageMember && recipient !== userId) throw new NotFoundException('Conversation not found.');
    const conversation = await this.conversations.findOne({ pageId, ...(projectId ? { projectId } : {}), userId: recipient }) ?? await this.conversations.create({ pageId, userId: recipient, ...(projectId ? { projectId } : {}), messages: [] });
    conversation.messages.push({ senderId: userId as any, text: text.trim() });
    await conversation.save();
    return conversation.populate('messages.senderId', 'name email');
  }
  private async findAccessible(userId: string, pageId: string, projectId?: string): Promise<ConversationDocument | null> {
    const page = await this.companies.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found.');
    return this.conversations.findOne({ pageId, ...(projectId ? { projectId } : {}), $or: [{ userId }, { pageId }] });
  }
}
