import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CalendarEvent, CalendarEventDocument } from './calendar-event.schema';

@Injectable()
export class CalendarEventsService {
  constructor(
    @InjectModel(CalendarEvent.name)
    private readonly events: Model<CalendarEventDocument>,
  ) {}

  async list(
    userId: string,
  ): Promise<Array<{ id: string; title: string; description: string; startsAt: Date }>> {
    const events = await this.events.find({ userId }).sort({ startsAt: 1 }).lean();
    return events.map(({ _id, ...event }) => ({ ...event, id: _id.toString() }));
  }

  async create(userId: string, input: { title?: string; description?: string; startsAt?: string }) {
    if (!input || typeof input.title !== 'string' || !input.title.trim()) {
      throw new BadRequestException('Event title is required.');
    }
    if (input.title.trim().length > 120) {
      throw new BadRequestException('Event title must be 120 characters or fewer.');
    }
    if (
      input.description !== undefined &&
      (typeof input.description !== 'string' || input.description.length > 2000)
    ) {
      throw new BadRequestException('Event description must be 2000 characters or fewer.');
    }
    if (typeof input.startsAt !== 'string' || !input.startsAt.trim()) {
      throw new BadRequestException('Event date and time are required.');
    }
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Event date and time are invalid.');
    }
    if (startsAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Choose a future time. Events cannot be scheduled in the past.',
      );
    }

    const event = await this.events.create({
      userId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      startsAt,
    });
    return {
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
    };
  }

  async remove(userId: string, id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Event not found.');
    const result = await this.events.deleteOne({ _id: id, userId });
    if (!result.deletedCount) throw new NotFoundException('Event not found.');
    return { deleted: true };
  }
}
