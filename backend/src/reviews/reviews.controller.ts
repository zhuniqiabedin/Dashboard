import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Post() create(@Req() request: AuthenticatedRequest, @Body() input: Record<string, unknown>) {
    return this.reviews.create(request.user.sub, input);
  }
  @Get('user/:id') forUser(@Param('id') id: string) {
    return this.reviews.forUser(id);
  }
  @Get('company/:id') forCompany(@Param('id') id: string) {
    return this.reviews.forCompany(id);
  }
}
