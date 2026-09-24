import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Branches } from '../branches.enum';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 }) title!: string;
  @Prop({ required: true, trim: true, maxlength: 220 }) summary!: string;
  @Prop({ default: '', maxlength: 1000 }) details!: string;
  @Prop({ required: true, trim: true, maxlength: 80 }) category!: string;
  @Prop({ type: String, enum: Branches, default: Branches.Other }) branch!: Branches;
  @Prop({ type: String, enum: ['In progress', 'Planning'], default: 'Planning' })
  status!: 'In progress' | 'Planning';
  @Prop({ min: 0, max: 100, default: 0 }) progress!: number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
