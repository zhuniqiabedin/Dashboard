import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Company, CompanySchema } from '../companies/company.schema';
import { JobApplication, JobApplicationSchema } from '../jobs/job-application.schema';
import {
  ProjectApplication,
  ProjectApplicationSchema,
} from '../projects/project-application.schema';
import { ReviewsController } from './reviews.controller';
import { Review, ReviewSchema } from './review.schema';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: ProjectApplication.name, schema: ProjectApplicationSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
