import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CalendarEvent, CalendarEventDocument } from './calendar-event.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';

@Injectable()
export class CalendarEventsService {
  constructor(
    @InjectModel(CalendarEvent.name)
    private readonly events: Model<CalendarEventDocument>,
    @InjectModel(Notification.name)
    private readonly notifications: Model<NotificationDocument>,
  ) {}

  async list(
    userId: string,
  ): Promise<Array<{ id: string; title: string; description: string; startsAt: Date }>> {
    const events = await this.events.find({ userId }).sort({ startsAt: 1 }).lean();
    return events.map(({ _id, ...event }) => ({ ...event, id: _id.toString() }));
  }

  async createMeeting(
    userId: string,
    input: { title?: string; description?: string; startsAt?: string },
  ) {
    if (!input || typeof input.title !== 'string' || !input.title.trim()) {
      throw new BadRequestException('Meeting title is required.');
    }
    if (input.title.trim().length > 120) {
      throw new BadRequestException('Meeting title must be 120 characters or fewer.');
    }
    if (
      input.description !== undefined &&
      (typeof input.description !== 'string' || input.description.length > 2000)
    ) {
      throw new BadRequestException('Meeting notes must be 2000 characters or fewer.');
    }
    if (typeof input.startsAt !== 'string' || !input.startsAt.trim()) {
      throw new BadRequestException('Meeting date and time are required.');
    }
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Meeting date and time are invalid.');
    }
    if (startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Choose a future time for the meeting.');
    }

    const meeting = await this.events.create({
      userId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      startsAt,
      kind: 'meeting',
    });
    return {
      id: meeting._id.toString(),
      title: meeting.title,
      description: meeting.description,
      startsAt: meeting.startsAt,
      kind: meeting.kind,
    };
  }

  async remove(userId: string, id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Event not found.');
    const result = await this.events.deleteOne({ _id: id, userId });
    if (!result.deletedCount) throw new NotFoundException('Event not found.');
    await this.notifications.deleteOne({ userId, type: 'event_reminder', itemId: id });
    return { deleted: true };
  }
}
