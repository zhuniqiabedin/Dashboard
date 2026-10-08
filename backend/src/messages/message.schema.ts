import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: true, timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' }) senderId!: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 4000 }) text!: string;
  @Prop({ type: Date }) readAt?: Date;
}
export const MessageSchema = SchemaFactory.createForClass(Message);

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Company', index: true })
  pageId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Project', index: true }) projectId?: Types.ObjectId;
  @Prop({ type: Date, default: Date.now }) lastActivityAt!: Date;
  @Prop({ type: [MessageSchema], default: [] }) messages!: Message[];
}
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
