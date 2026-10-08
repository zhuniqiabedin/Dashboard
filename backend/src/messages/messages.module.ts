import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Company, CompanySchema } from '../companies/company.schema';
import { Conversation, ConversationSchema } from './message.schema';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

@Module({ imports: [AuthModule, MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }, { name: Company.name, schema: CompanySchema }])], controllers: [MessagesController], providers: [MessagesService, MessagesGateway] })
export class MessagesModule {}
