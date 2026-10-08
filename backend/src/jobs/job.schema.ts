import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type JobDocument = HydratedDocument<Job>;
@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, ref: 'Company', index: true }) pageId!: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 120 }) title!: string;
  @Prop({ required: true, trim: true, maxlength: 120 }) location!: string;
  @Prop({ default: '', maxlength: 1000 }) description!: string;
  @Prop({ default: 'Open', enum: ['Open', 'Closed'] }) status!: 'Open' | 'Closed';
  @Prop({ min: 0, default: 0 }) annualSalary!: number;
}
export const JobSchema = SchemaFactory.createForClass(Job);
