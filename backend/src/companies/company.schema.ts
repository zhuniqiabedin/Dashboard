import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;
export type CompanyRole = 'owner' | 'admin' | 'recruiter' | 'member';

@Schema({ _id: false })
export class CompanyEmployee {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: ['owner', 'admin', 'recruiter', 'member'], default: 'member' })
  role!: CompanyRole;
}
export const CompanyEmployeeSchema = SchemaFactory.createForClass(CompanyEmployee);

@Schema({ timestamps: true, collection: 'companies' })
export class Company {
  @Prop({ required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ required: true, trim: true, maxlength: 160 }) description!: string;
  @Prop({ default: '', trim: true }) website!: string;
  @Prop({ default: '', trim: true }) location!: string;
  @Prop({ default: '' }) logo!: string;
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  ownerId!: Types.ObjectId;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  employeeIds!: Types.ObjectId[];
  @Prop({ type: [CompanyEmployeeSchema], default: [] }) employees!: CompanyEmployee[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }], default: [] })
  projectIds!: Types.ObjectId[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Job' }], default: [] }) jobIds!: Types.ObjectId[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
