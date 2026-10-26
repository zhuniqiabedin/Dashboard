import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('mine') list(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>[]> {
    return this.projects.listMine(request.user.sub);
  }
  @Get('discover') discover(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>[]> {
    return this.projects.listPublished(request.user.sub);
  }
  @Get('matching-for-employee') matchingForEmployee(
    @Req() request: AuthenticatedRequest,
    @Query('pageId') pageId: string,
    @Query('employeeId') employeeId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.projects.matchingProjectsForEmployee(request.user.sub, pageId, employeeId);
  }
  @Post(':id/apply') apply(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('cv') cv: Record<string, unknown>,
  ) {
    return this.projects.apply(request.user.sub, id, cv);
  }
  @Post(':id/apply-for-employee') applyForEmployee(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('pageId') pageId: string,
    @Body('employeeId') employeeId: string,
  ) {
    return this.projects.applyForEmployee(request.user.sub, id, pageId, employeeId);
  }
  @Get('applications/mine') myApplications(@Req() request: AuthenticatedRequest) {
    return this.projects.listMyApplications(request.user.sub);
  }
  @Get(':id/applications') applicants(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.projects.listApplicants(request.user.sub, id);
  }
  @Patch(':id/applications/:applicationId/status') updateApplicationStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @Body('status') status: string,
  ) {
    return this.projects.updateApplicationStatus(request.user.sub, id, applicationId, status);
  }
  @Get(':id/matching-users') matchingUsers(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>[]> {
    return this.projects.matchingUsers(id, request.user.sub);
  }
  @Get('page/:pageId') listForPage(
    @Req() request: AuthenticatedRequest,
    @Param('pageId') pageId: string,
  ) {
    return this.projects.listForPage(request.user.sub, pageId);
  }
  @Post() create(@Req() request: AuthenticatedRequest, @Body() input: CreateProjectDto) {
    return this.projects.create(request.user.sub, input);
  }
  @Patch(':id') update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projects.update(request.user.sub, id, input);
  }
  @Delete(':id') remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.projects.remove(request.user.sub, id);
  }
}
