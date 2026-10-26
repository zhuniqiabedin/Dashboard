import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;
  @Prop({ type: Boolean, default: true })
  emailVerified!: boolean;
  @Prop({ type: String, select: false })
  emailConfirmationTokenHash?: string;
  @Prop({ type: Date, select: false })
  emailConfirmationExpiresAt?: Date;
  @Prop({ type: String, select: false })
  emailConfirmationCodeHash?: string;
  @Prop({ type: Date, select: false })
  emailConfirmationCodeExpiresAt?: Date;
  @Prop({ type: Number, default: 0, select: false })
  emailConfirmationCodeAttempts?: number;
  @Prop({ type: Date, default: Date.now })
  lastSeen!: Date;
  @Prop({ type: Boolean, default: true }) activeStatus!: boolean;
  @Prop({ type: Boolean, default: false }) isOnline!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
