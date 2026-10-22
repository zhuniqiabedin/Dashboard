import { Body, Controller, Get, Put, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CvService } from './cv.service';

@Controller('cv')
@UseGuards(JwtAuthGuard)
export class CvController {
  constructor(private readonly cv: CvService) {}

  @Get('templates') templates() {
    return this.cv.listTemplates();
  }

  @Get('me') mine(@Req() request: AuthenticatedRequest) {
    return this.cv.mine(request.user.sub);
  }

  @Put('me') save(@Req() request: AuthenticatedRequest, @Body() input: Record<string, unknown>) {
    return this.cv.save(request.user.sub, input);
  }

  @Get('pdf')
  async pdf(
    @Req() request: AuthenticatedRequest,
    @Query('template') template: string,
  ): Promise<StreamableFile> {
    const buffer = await this.cv.generatePdf(request.user.sub, template);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="resume-${template}.pdf"`,
    });
  }

  @Get('preview')
  async preview(
    @Req() request: AuthenticatedRequest,
    @Query('template') template: string,
  ): Promise<StreamableFile> {
    const buffer = await this.cv.generatePdf(request.user.sub, template);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="resume-${template}.pdf"`,
    });
  }
}
