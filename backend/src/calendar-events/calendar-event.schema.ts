import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CalendarEventDocument = HydratedDocument<CalendarEvent>;

@Schema({ timestamps: true, collection: 'calendar_events' })
export class CalendarEvent {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title!: string;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  description!: string;

  @Prop({ required: true, type: Date, index: true })
  startsAt!: Date;
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);
