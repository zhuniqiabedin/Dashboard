import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ProjectsModule } from './projects/projects.module';
import { CompaniesModule } from './companies/companies.module';
import { AppController } from './app.controller';
import { JobsModule } from './jobs/jobs.module';
import { MessagesModule } from './messages/messages.module';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CvModule } from './cv/cv.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/career-space';
        return {
          uri,
          // Atlas database users are authenticated through the admin database even
          // when the application uses a named database such as career-space.
          ...(uri.startsWith('mongodb+srv://') ? { authSource: 'admin' } : {}),
        };
      },
    }),
    AuthModule,
    ProfilesModule,
    ProjectsModule,
    CompaniesModule,
    JobsModule,
    MessagesModule,
    CalendarEventsModule,
    NotificationsModule,
    CvModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
