import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;
export type CompanyRole = 'owner' | 'admin' | 'recruiter' | 'hr' | 'member';

@Schema({ _id: false })
export class CompanyEmployee {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null }) groupId?: Types.ObjectId | null;
  @Prop({ type: String, enum: ['owner', 'admin', 'recruiter', 'hr', 'member'], default: 'member' })
  role?: CompanyRole;
  @Prop({
    type: [String],
    enum: ['owner', 'admin', 'recruiter', 'hr', 'member'],
    default: undefined,
  })
  roles?: CompanyRole[];
}
export const CompanyEmployeeSchema = SchemaFactory.createForClass(CompanyEmployee);

@Schema()
export class CompanyGroup {
  _id!: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 80 }) name!: string;
}
export const CompanyGroupSchema = SchemaFactory.createForClass(CompanyGroup);

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
  @Prop({ type: [CompanyGroupSchema], default: [] }) groups!: CompanyGroup[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }], default: [] })
  projectIds!: Types.ObjectId[];
  // Company jobs are stored as job IDs so pages can load their full records from this list.
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }], default: [] })
  projects!: Types.ObjectId[];
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Job' }], default: [] })
  jobs!: Types.ObjectId[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
