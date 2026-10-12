import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type JobApplicationDocument = HydratedDocument<JobApplication>;
@Schema({ timestamps: true, collection: 'jobapplications' })
export class JobApplication {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Job' }) jobId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, ref: 'Company', index: true }) pageId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true }) userId!: Types.ObjectId;
  @Prop({ default: 'Submitted', enum: ['Submitted'] }) status!: string;
}
export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });
