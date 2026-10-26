import { Body, Controller, Delete, Patch, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateJobDto } from './job.dto';
import { JobsService } from './jobs.service';
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}
  @Get('published') published(@Req() req: AuthenticatedRequest) {
    return this.jobs.listPublished(req.user.sub);
  }
  @Get('applications/mine') myApplications(@Req() req: AuthenticatedRequest) {
    return this.jobs.listMyApplications(req.user.sub);
  }
  @Get('page/:pageId') list(@Req() req: AuthenticatedRequest, @Param('pageId') pageId: string) {
    return this.jobs.listForPage(req.user.sub, pageId);
  }
  @Post(':id/apply') apply(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobs.apply(req.user.sub, id);
  }
  @Get(':id/applications') applicants(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobs.listApplicants(req.user.sub, id);
  }
  @Patch(':id/applications/:applicationId/status') updateApplicationStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @Body('status') status: string,
  ) {
    return this.jobs.updateApplicationStatus(req.user.sub, id, applicationId, status);
  }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() input: CreateJobDto) {
    return this.jobs.create(req.user.sub, input);
  }
  @Patch(':id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: Partial<CreateJobDto>,
  ) {
    return this.jobs.update(req.user.sub, id, input);
  }
  @Delete(':id') remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobs.remove(req.user.sub, id);
  }
}
