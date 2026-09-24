import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Branches } from '../branches.enum';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema({ timestamps: true, collection: 'userprofiles' })
export class Profile {
  @Prop({ type: Types.ObjectId, required: true, unique: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, default: '' })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ default: '' })
  headline!: string;

  @Prop({ default: '' })
  location!: string;

  @Prop({ type: String, enum: Branches, default: Branches.Other })
  branch!: Branches;

  @Prop({ default: '' })
  about!: string;

  @Prop({ default: '' })
  skills!: string;

  @Prop({ default: '' })
  website!: string;

  @Prop({ default: '' })
  experience!: string;

  @Prop({ default: '' })
  education!: string;

  @Prop({ default: '' })
  photo!: string;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
