import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;
@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) pageId!: Types.ObjectId;
  @Prop({ required: true, enum: ['job_application', 'project_application'] }) type!: string;
  @Prop({ type: Types.ObjectId, required: true }) itemId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) applicationId!: Types.ObjectId;
  @Prop({ required: true }) message!: string;
  @Prop({ type: Date, default: null }) readAt?: Date | null;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);
