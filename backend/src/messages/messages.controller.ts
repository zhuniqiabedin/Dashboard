import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService, private readonly gateway: MessagesGateway) {}
  @Get('mine') listMine(@Req() req: AuthenticatedRequest) {
    console.log(req.user.sub, "userId")
    return this.messages.listMine(req.user.sub);
  }
  @Get('project/:projectId') listForProject(@Param('projectId') projectId: string) {
    return this.messages.listForProject(projectId);
  }
  @Get('page/:pageId') listForPage(@Req() req: AuthenticatedRequest, @Param('pageId') pageId: string) {
    return this.messages.listForPage(req.user.sub, pageId);
  }
  @Get(':pageId/:projectId') list(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.messages.list(req.user.sub, pageId, projectId);
  }
  @Post('conversation/:id/read') markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.markReadById(req.user.sub, id);
  }
  @Post(':pageId/:projectId') send(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
    @Param('projectId') projectId: string,
    @Body('text') text: string,
    @Body('recipientUserId') recipientUserId?: string,
  ) {
    return this.messages.send(req.user.sub, pageId, text, projectId, recipientUserId).then((conversation) => {
      this.gateway.conversationUpdated(conversation);
      return conversation;
    });
  }
}
