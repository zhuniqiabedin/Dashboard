import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Job, JobSchema } from './job.schema';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
@Module({ imports: [AuthModule, MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }])], controllers: [JobsController], providers: [JobsService] })
export class JobsModule {}
