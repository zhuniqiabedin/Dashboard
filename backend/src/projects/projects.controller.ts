import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('mine') list(@Req() request: AuthenticatedRequest) {
    return this.projects.listMine(request.user.sub);
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
