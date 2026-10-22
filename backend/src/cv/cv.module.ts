import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Profile, ProfileSchema } from '../profiles/profile.schema';
import { User, UserSchema } from '../users/user.schema';
import { CvController } from './cv.controller';
import { CvRecord, CvSchema } from './cv.schema';
import { CvService } from './cv.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CvRecord.name, schema: CvSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CvController],
  providers: [CvService],
})
export class CvModule {}
