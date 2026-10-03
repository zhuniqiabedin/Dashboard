import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from './project.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Company, CompanySchema } from '../companies/company.schema';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }, { name: Company.name, schema: CompanySchema }])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
