import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CvDocument = HydratedDocument<CvRecord>;

@Schema({ _id: false })
export class CvProjectEntry {
  @Prop({ required: true, trim: true, maxlength: 160 }) title!: string;
  @Prop({ default: '', trim: true, maxlength: 3000 }) description!: string;
  @Prop({ default: '', trim: true, maxlength: 500 }) link!: string;
  @Prop({ type: [String], default: [] }) skills!: string[];
}
const CvProjectSchema = SchemaFactory.createForClass(CvProjectEntry);

@Schema({ _id: false })
export class CvEducationEntry {
  @Prop({ required: true, trim: true, maxlength: 160 }) school!: string;
  @Prop({ required: true, trim: true, maxlength: 160 }) degree!: string;
  @Prop({ default: '', trim: true, maxlength: 120 }) period!: string;
}
const CvEducationSchema = SchemaFactory.createForClass(CvEducationEntry);

@Schema({ _id: false })
export class CvCertificateEntry {
  @Prop({ required: true, trim: true, maxlength: 160 }) name!: string;
  @Prop({ default: '', trim: true, maxlength: 160 }) issuer!: string;
  @Prop({ default: '', trim: true, maxlength: 40 }) year!: string;
}
const CvCertificateSchema = SchemaFactory.createForClass(CvCertificateEntry);

@Schema({ timestamps: true, collection: 'cvs' })
export class CvRecord {
  @Prop({ type: Types.ObjectId, required: true, unique: true, ref: 'User', index: true })
  userId!: Types.ObjectId;
  @Prop({ type: [String], default: [] }) skills!: string[];
  @Prop({ type: [CvProjectSchema], default: [] }) projects!: CvProjectEntry[];
  @Prop({ type: [CvEducationSchema], default: [] }) education!: CvEducationEntry[];
  @Prop({ type: [CvCertificateSchema], default: [] }) certificates!: CvCertificateEntry[];
}

export const CvSchema = SchemaFactory.createForClass(CvRecord);
