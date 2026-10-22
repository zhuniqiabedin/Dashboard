import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarEventsService } from './calendar-events.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly events: CalendarEventsService) {}

  @Get('events')
  list(
    @Req() request: AuthenticatedRequest,
  ): Promise<Array<{ id: string; title: string; description: string; startsAt: Date }>> {
    return this.events.list(request.user.sub);
  }

  @Post('events')
  create(): never {
    throw new ForbiddenException('Creating events is not allowed.');
  }

  @Post('meetings')
  createMeeting(
    @Req() request: AuthenticatedRequest,
    @Body() input: { title?: string; description?: string; startsAt?: string },
  ) {
    return this.events.createMeeting(request.user.sub, input);
  }

  @Delete('events/:id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.events.remove(request.user.sub, id);
  }
}
