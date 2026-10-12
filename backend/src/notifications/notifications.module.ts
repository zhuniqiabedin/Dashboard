import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Company, CompanySchema } from '../companies/company.schema';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
@Module({ imports: [AuthModule, MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }, { name: Company.name, schema: CompanySchema }])], controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
