import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type ProjectApplicationDocument = HydratedDocument<ProjectApplication>;
@Schema({ timestamps: true, collection: 'projectapplications' })
export class ProjectApplication {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Project', index: true }) projectId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, ref: 'Company', index: true }) pageId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true }) userId!: Types.ObjectId;
  @Prop({ default: 'New', enum: ['New', 'Shortlisted', 'Contacted', 'Interviewing', 'Selected', 'Rejected', 'Completed'] }) status!: string;
  @Prop({ type: Object, default: {} }) profileSnapshot!: Record<string, unknown>;
  @Prop({ type: Object, default: {} }) cvSnapshot!: Record<string, unknown>;
}
export const ProjectApplicationSchema = SchemaFactory.createForClass(ProjectApplication);
ProjectApplicationSchema.index({ projectId: 1, userId: 1 }, { unique: true });
