import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
@Controller('notifications') @UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get('mine') mine(@Req() req: AuthenticatedRequest) { return this.notifications.mine(req.user.sub); }
  @Post(':id/read') read(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.notifications.markRead(req.user.sub, id); }
  @Post('read-all') readAll(@Req() req: AuthenticatedRequest) { return this.notifications.markAllRead(req.user.sub); }
}
