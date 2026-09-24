import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branches } from '../branches.enum';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { Project, ProjectDocument } from './project.schema';

@Injectable()
export class ProjectsService {
  constructor(@InjectModel(Project.name) private readonly projects: Model<ProjectDocument>) {}

  listMine(userId: string) {
    return this.projects.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async create(userId: string, input: CreateProjectDto) {
    const data = this.validate(input);
    return this.projects.create({ ...data, userId });
  }

  async update(userId: string, id: string, input: UpdateProjectDto) {
    const project = await this.projects
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: this.validate(input) },
        { new: true, runValidators: true },
      )
      .lean();
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async remove(userId: string, id: string) {
    const result = await this.projects.deleteOne({ _id: id, userId });
    if (!result.deletedCount) throw new NotFoundException('Project not found.');
    return { deleted: true };
  }

  private validate(input: CreateProjectDto): Record<string, unknown> {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Project data is required.');
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 100) {
      throw new BadRequestException('Project title is required and must be under 100 characters.');
    }
    if (typeof input.summary !== 'string' || !input.summary.trim() || input.summary.length > 220) {
      throw new BadRequestException(
        'Project summary is required and must be under 220 characters.',
      );
    }
    if (typeof input.category !== 'string' || !input.category.trim()) {
      throw new BadRequestException('Project category is required.');
    }
    if (!Object.values(Branches).includes(input.branch))
      throw new BadRequestException('Invalid branch.');
    const status = input.status ?? 'Planning';
    const progress = input.progress ?? 0;
    if (
      !['In progress', 'Planning'].includes(status) ||
      !Number.isInteger(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      throw new BadRequestException('Invalid project status or progress.');
    }
    return {
      title: input.title.trim(),
      summary: input.summary.trim(),
      details: input.details?.trim() ?? '',
      category: input.category.trim(),
      branch: input.branch,
      status,
      progress,
    };
  }
}
