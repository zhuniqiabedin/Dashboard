import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Job, JobSchema } from '../jobs/job.schema';
import { Project, ProjectSchema } from '../projects/project.schema';
import { User, UserSchema } from '../users/user.schema';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company, CompanySchema } from './company.schema';
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
