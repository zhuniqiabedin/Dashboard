import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Company, CompanySchema } from '../companies/company.schema';
import { Job, JobSchema } from './job.schema';
import { JobsController } from './jobs.controller';
import { Profile, ProfileSchema } from '../profiles/profile.schema';
import { JobApplication, JobApplicationSchema } from './job-application.schema';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [AuthModule, NotificationsModule, MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }, { name: JobApplication.name, schema: JobApplicationSchema }, { name: Job.name, schema: JobSchema }, { name: Company.name, schema: CompanySchema }])], controllers: [JobsController], providers: [JobsService] })
export class JobsModule {}
