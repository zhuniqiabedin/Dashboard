import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
type UploadedMessageFile = { size: number; mimetype: string; originalname: string; buffer: Buffer };
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly gateway: MessagesGateway,
  ) {}
  @Get('mine') listMine(@Req() req: AuthenticatedRequest) {
    console.log(req.user.sub, 'userId');
    return this.messages.listMine(req.user.sub);
  }
  @Patch('presence') async activeStatus(
    @Req() req: AuthenticatedRequest,
    @Body('active') active: boolean,
  ) {
    if (typeof active !== 'boolean') return { ok: false };
    const result = await this.messages.setActiveStatus(req.user.sub, active);
    await this.gateway.presenceChanged(req.user.sub, active);
    return result;
  }
  @Post(':pageId/:projectId/attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) =>
        callback(null, file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf'),
    }),
  )
  async upload(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: UploadedMessageFile,
    @Body('recipientUserId') recipientUserId: string,
  ) {
    if (!file) throw new BadRequestException('Choose an image or PDF up to 10 MB.');
    const conversation = await this.messages.uploadAttachment(
      req.user.sub,
      pageId,
      projectId,
      file,
      recipientUserId,
    );
    this.gateway.conversationUpdated(conversation);
    return conversation;
  }
  @Get('attachment/:id') async download(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const attachment = await this.messages.downloadAttachment(req.user.sub, id);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    attachment.stream.pipe(response);
  }
  @Get('project/:projectId') listForProject(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return this.messages.listForProject(req.user.sub, projectId);
  }
  @Get('page/:pageId') listForPage(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
  ) {
    return this.messages.listForPage(req.user.sub, pageId);
  }
  @Get(':pageId/:projectId') list(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.messages.list(req.user.sub, pageId, projectId);
  }
  @Post('conversation/:id/read') markRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.messages.markReadById(req.user.sub, id);
  }
  @Post(':pageId/:projectId') send(
    @Req() req: AuthenticatedRequest,
    @Param('pageId') pageId: string,
    @Param('projectId') projectId: string,
    @Body('text') text: string,
    @Body('recipientUserId') recipientUserId?: string,
  ) {
    return this.messages
      .send(req.user.sub, pageId, text, projectId, recipientUserId)
      .then((conversation) => {
        this.gateway.conversationUpdated(conversation);
        return conversation;
      });
  }
}
