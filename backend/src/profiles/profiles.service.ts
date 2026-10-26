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
    if (profile) return profile;
    const user = await this.users.findById(userId).select('name email').lean();
    if (!user) throw new NotFoundException('User not found.');
    return this.profiles.create({ userId, name: user.name, email: user.email, skills: '' });
  }

  async getPublic(userId: string) {
    const profile = await this.profiles
      .findOne({ userId, isPublic: { $ne: false } })
      .select(
        'userId name headline location branch about skills website experience education photo availability preferredWorkTypes preferredWorkplace',
      )
      .lean();
    if (!profile) throw new NotFoundException('Public profile not found.');
    return profile;
  }

  async updateMine(userId: string, input: UpdateProfileDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Profile data is required.');
    const allowed = [
      'name',
      'headline',
      'phone',
      'location',
      'branch',
      'about',
      'skills',
      'website',
      'experience',
      'education',
      'photo',
      'isPublic',
      'availability',
      'preferredWorkTypes',
      'preferredWorkplace',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = (input as Record<string, unknown>)[key];
      if (value === undefined) continue;
      if (key === 'isPublic') {
        if (typeof value !== 'boolean')
          throw new BadRequestException('Invalid profile visibility value.');
        update[key] = value;
        continue;
      }
      if (key === 'preferredWorkTypes') {
        if (
          !Array.isArray(value) ||
          value.length > 5 ||
          value.some((item) => typeof item !== 'string' || item.length > 40)
        )
          throw new BadRequestException('Choose up to five valid work types.');
        update[key] = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
        continue;
      }
      if (
        key === 'availability' &&
        !['Open to opportunities', 'Not looking', 'Open to projects'].includes(String(value))
      )
        throw new BadRequestException('Invalid availability.');
      if (
        key === 'preferredWorkplace' &&
        !['Any', 'Remote', 'Hybrid', 'Onsite'].includes(String(value))
      )
        throw new BadRequestException('Invalid workplace preference.');
      if (
        typeof value !== 'string' ||
        value.length > (key === 'photo' ? 2_100_000 : key === 'phone' ? 40 : 3000)
      ) {
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
