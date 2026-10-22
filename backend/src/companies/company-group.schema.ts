import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CompanyGroupDocument = HydratedDocument<CompanyGroupRecord>;

@Schema({ timestamps: true, collection: 'company_groups' })
export class CompanyGroupRecord {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Company', index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  normalizedName!: string;
}

export const CompanyGroupSchema = SchemaFactory.createForClass(CompanyGroupRecord);
CompanyGroupSchema.index({ companyId: 1, normalizedName: 1 }, { unique: true });
