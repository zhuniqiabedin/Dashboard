import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateJobDto } from './job.dto';
import { Job, JobDocument } from './job.schema';
@Injectable()
export class JobsService {
  constructor(@InjectModel(Job.name) private readonly jobs: Model<JobDocument>) {}
  listForPage(userId: string, pageId: string) { return this.jobs.find({ userId, pageId }).sort({ createdAt: -1 }).lean(); }
  create(userId: string, input: CreateJobDto) {
    if (!input.pageId || !input.title?.trim() || !input.location?.trim()) throw new BadRequestException('Page, job title, and location are required.');
    return this.jobs.create({ userId, pageId: input.pageId, title: input.title.trim(), location: input.location.trim(), description: input.description?.trim() ?? '', status: input.status ?? 'Open' });
  }
}

