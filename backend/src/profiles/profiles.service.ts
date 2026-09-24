import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from './profile.schema';
import { UpdateProfileDto } from './profile.dto';
import { Branches } from '../branches.enum';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async getMine(userId: string) {
    const profile = await this.profiles.findOne({ userId }).lean();
    if (!profile) throw new NotFoundException('Profile not found.');
    return profile;
  }

  async updateMine(userId: string, input: UpdateProfileDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Profile data is required.');
    const allowed = [
      'name',
      'headline',
      'location',
      'branch',
      'about',
      'skills',
      'website',
      'experience',
      'education',
      'photo',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = (input as Record<string, unknown>)[key];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > (key === 'photo' ? 2_100_000 : 3000)) {
        throw new BadRequestException(`Invalid ${key} value.`);
      }
      update[key] = value;
    }
    if (
      update.branch !== undefined &&
      !Object.values(Branches).includes(update.branch as Branches)
    ) {
      throw new BadRequestException('Invalid branch value.');
    }
    const profile = await this.profiles
      .findOneAndUpdate({ userId }, { $set: update }, { new: true, runValidators: true })
      .lean();
    if (!profile) throw new NotFoundException('Profile not found.');
    if (typeof update['name'] === 'string') {
      await this.users.updateOne({ _id: userId }, { $set: { name: update['name'] } });
    }
    return profile;
  }
}
