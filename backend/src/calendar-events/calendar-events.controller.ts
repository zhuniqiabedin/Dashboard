import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarEventsService } from './calendar-events.service';

@Controller('calendar/events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly events: CalendarEventsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
  ): Promise<Array<{ id: string; title: string; description: string; startsAt: Date }>> {
    return this.events.list(request.user.sub);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: { title?: string; description?: string; startsAt?: string },
  ) {
    return this.events.create(request.user.sub, input);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.events.remove(request.user.sub, id);
  }
}
