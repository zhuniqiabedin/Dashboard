import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;
@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Company' }) pageId?: Types.ObjectId;
  @Prop({
    required: true,
    enum: [
      'job_application',
      'project_application',
      'job_application_update',
      'project_application_update',
      'matching_job',
      'matching_project',
      'message',
      'company_message',
      'event_reminder',
    ],
  })
  type!: string;
  @Prop({ type: Types.ObjectId }) itemId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId }) applicationId?: Types.ObjectId;
  @Prop({ required: true }) message!: string;
  @Prop({ type: Date, default: null }) readAt?: Date | null;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index(
  { userId: 1, itemId: 1 },
  { unique: true, partialFilterExpression: { type: 'event_reminder' } },
);
