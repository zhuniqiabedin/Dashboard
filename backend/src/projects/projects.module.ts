import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from './project.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Company, CompanySchema } from '../companies/company.schema';
import { Profile, ProfileSchema } from '../profiles/profile.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectApplication, ProjectApplicationSchema } from './project-application.schema';
import { Review, ReviewSchema } from '../reviews/review.schema';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: ProjectApplication.name, schema: ProjectApplicationSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
