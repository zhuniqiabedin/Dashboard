import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateJobDto } from './job.dto';
import { JobsService } from './jobs.service';
@Controller('jobs') @UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}
  @Get('page/:pageId') list(@Req() req: AuthenticatedRequest, @Param('pageId') pageId: string) { return this.jobs.listForPage(req.user.sub, pageId); }
  @Post() create(@Req() req: AuthenticatedRequest, @Body() input: CreateJobDto) { return this.jobs.create(req.user.sub, input); }
}

