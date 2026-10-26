import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true, collection: 'workreviews' })
export class Review {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  reviewerId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', index: true }) subjectUserId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Company', index: true }) subjectPageId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) applicationId!: Types.ObjectId;
  @Prop({ required: true, enum: ['job', 'project'] }) context!: 'job' | 'project';
  @Prop({ required: true, enum: ['candidate_to_company', 'company_to_candidate'] }) direction!:
    'candidate_to_company' | 'company_to_candidate';
  @Prop({ required: true, min: 1, max: 5 }) overall!: number;
  @Prop({ required: true, min: 1, max: 5 }) communication!: number;
  @Prop({ required: true, min: 1, max: 5 }) delivery!: number;
  @Prop({ required: true, min: 1, max: 5 }) collaboration!: number;
  @Prop({ default: '', trim: true, maxlength: 1200 }) text!: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ applicationId: 1, direction: 1 }, { unique: true });
