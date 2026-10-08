import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CalendarEvent, CalendarEventSchema } from './calendar-event.schema';
import { CalendarEventsController } from './calendar-events.controller';
import { CalendarEventsService } from './calendar-events.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: CalendarEvent.name, schema: CalendarEventSchema }]),
  ],
  controllers: [CalendarEventsController],
  providers: [CalendarEventsService],
})
export class CalendarEventsModule {}
