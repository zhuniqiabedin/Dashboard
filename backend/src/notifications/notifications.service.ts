import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { CalendarEvent, CalendarEventDocument } from '../calendar-events/calendar-event.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(CalendarEvent.name) private readonly events: Model<CalendarEventDocument>,
  ) {}
  async application(
    pageId: Types.ObjectId,
    type: string,
    itemId: Types.ObjectId,
    applicationId: Types.ObjectId,
    applicant: string,
  ) {
    const company = await this.companies.findById(pageId).lean();
    if (!company) return;
    const recipients = new Set([company.ownerId.toString()]);
    for (const employee of company.employees ?? []) {
      const assigned = Array.isArray((employee as any).roles)
        ? (employee as any).roles
        : [(employee as any).role];
      if (assigned.some((role: string) => ['admin', 'recruiter', 'hr'].includes(role)))
        recipients.add(employee.userId.toString());
    }
    await this.notifications
      .insertMany(
        [...recipients].map((userId) => ({
          userId: new Types.ObjectId(userId),
          pageId,
          type,
          itemId,
          applicationId,
          message: `${applicant} applied to a ${type === 'job_application' ? 'job' : 'project'}.`,
        })),
        { ordered: false },
      )
      .catch(() => undefined);
  }

  async applicationStatus(
    userId: Types.ObjectId,
    type: 'job' | 'project',
    itemId: Types.ObjectId,
    status: string,
  ) {
    await this.notifications.create({
      userId,
      type: type === 'job' ? 'job_application_update' : 'project_application_update',
      itemId,
      message: `Your ${type} application status is now ${status}.`,
    });
  }

  async matchingOpportunity(
    userIds: Types.ObjectId[],
    type: 'job' | 'project',
    itemId: Types.ObjectId,
    title: string,
    pageId: Types.ObjectId,
  ) {
    const notificationType = type === 'job' ? 'matching_job' : 'matching_project';
    await Promise.all(
      userIds.map((userId) =>
        this.notifications.updateOne(
          { userId, type: notificationType, itemId },
          {
            $setOnInsert: {
              userId,
              type: notificationType,
              itemId,
              pageId,
              message: `A ${type} matching your profile is available: ${title}.`,
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  async message(
    pageId: Types.ObjectId,
    senderId: string,
    recipientUserId: string,
    conversationId: Types.ObjectId,
    preview: string,
  ) {
    if (recipientUserId !== senderId) {
      await this.notifications.create({
        userId: new Types.ObjectId(recipientUserId),
        pageId,
        itemId: conversationId,
        type: 'message',
        message: `New message: ${preview.slice(0, 100)}`,
      });
      return;
    }
    const company = await this.companies.findById(pageId).lean();
    if (!company) return;
    const recipients = new Set([String(company.ownerId)]);
    for (const employee of company.employees ?? []) {
      const roles = Array.isArray((employee as any).roles)
        ? (employee as any).roles
        : [(employee as any).role];
      if (roles.some((role: string) => ['admin', 'recruiter', 'hr'].includes(role)))
        recipients.add(String(employee.userId));
    }
    recipients.delete(senderId);
    await this.notifications
      .insertMany(
        [...recipients].map((userId) => ({
          userId: new Types.ObjectId(userId),
          pageId,
          itemId: conversationId,
          type: 'company_message',
          message: `New message from a Workpath member: ${preview.slice(0, 100)}`,
        })),
        { ordered: false },
      )
      .catch(() => undefined);
  }
  mine(userId: string) {
    return this.notifications.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  }
  async markRead(userId: string, id: string) {
    await this.notifications.updateOne({ _id: id, userId }, { $set: { readAt: new Date() } });
    return { ok: true };
  }
  async markAllRead(userId: string) {
    await this.notifications.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
    return { ok: true };
  }

  @Cron('*/15 * * * *')
  async remindAboutUpcomingEvents(): Promise<void> {
    const now = Date.now();
    const events = await this.events
      .find({
        startsAt: {
          $gte: new Date(now + 23 * 60 * 60 * 1000 + 45 * 60 * 1000),
          $lte: new Date(now + 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        },
      })
      .select('_id userId title')
      .lean();
    for (const event of events) {
      await this.notifications.updateOne(
        { userId: event.userId, type: 'event_reminder', itemId: event._id },
        {
          $setOnInsert: {
            userId: event.userId,
            type: 'event_reminder',
            itemId: event._id,
            message: `Reminder: “${event.title}” is tomorrow.`,
          },
        },
        { upsert: true },
      );
    }
  }

  async clearEventReminder(userId: Types.ObjectId, eventId: Types.ObjectId): Promise<void> {
    await this.notifications.deleteOne({ userId, type: 'event_reminder', itemId: eventId });
  }
}
