import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branches } from '../branches.enum';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { Project, ProjectDocument } from './project.schema';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Profile, ProfileDocument } from '../profiles/profile.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projects: Model<ProjectDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
  ) {}

  async matchingUsers(projectId: string, userId: string): Promise<Record<string, unknown>[]> {
    const project = await this.projects
      .findOne({ _id: projectId, pageId: { $exists: true, $ne: null } })
      .lean();
    if (!project) throw new NotFoundException('Published project not found.');
    const required = new Set(
      (project.skills ?? []).map((skill) => skill.toLowerCase().trim()).filter(Boolean),
    );

    console.log(required, "requird")
    if (!required.size) return [];
    const profiles = await this.profiles
      .find({})
      .select('userId name headline location skills photo')
      .lean();
    const userProjects = await this.projects
      .find({ $or: [{ pageId: { $exists: false } }, { pageId: null }] })
      .select('userId title summary skills hourlyRate')
      .lean();
      console.log(profiles, "profiles")
    return profiles
      .map((profile) => {
        const rawSkills = String(profile.skills ?? '').trim();
        let skills: string[];
        try {
          const parsed = JSON.parse(rawSkills);
          skills = Array.isArray(parsed) ? parsed.map(String) : rawSkills.split(',');
        } catch {
          skills = rawSkills.split(',');
        }
        skills = skills.map((skill) => skill.toLowerCase().trim()).filter(Boolean);
        const matchedSkills = skills.filter((skill) => required.has(skill));
        console.log(matchedSkills, "matchedSkills")
        return {
          ...profile,
          projects: userProjects
            .filter((item) => String(item.userId) === String(profile.userId))
            .map((item) => ({ title: item.title, summary: item.summary, skills: item.skills, hourlyRate: item.hourlyRate ?? 0 })),
          pageId: String(project.pageId),
          projectId,
          match: Math.round((matchedSkills.length / required.size) * 100),
          matchedSkills,
        };
      })
      .filter((profile) => profile.match >= 50)
      .sort((a, b) => b.match - a.match);
  }

  async listForPage(userId: string, pageId: string): Promise<Record<string, unknown>[]> {
    const page = await this.companies.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found.');
    const member =
      page.ownerId.toString() === userId || page.employeeIds.some((id) => id.toString() === userId);
    const projects = await this.projects
      .find({ pageId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean();
    return projects.map(({ _id, userId: creator, ...project }) => ({
      ...project,
      isPublished: this.isCurrentlyPublished(project),
      id: _id.toString(),
      pageName: page.name,
      ...(member ? { createdBy: creator } : {}),
    }));
  }

  listMine(userId: string): Promise<Record<string, unknown>[]> {
    return this.projects
      .find({ userId, $or: [{ pageId: { $exists: false } }, { pageId: null }] })
      .sort({ createdAt: -1 })
      .lean()
      .then((projects) =>
        projects.map(({ _id, ...project }) => ({
          ...project,
          isPublished: this.isCurrentlyPublished(project),
          id: _id.toString(),
        })),
      );
  }

  listPublished(): Promise<Record<string, unknown>[]> {
    const now = new Date();
    return this.projects
      .find({
        pageId: { $exists: true, $ne: null },
        isPublished: true,
        $or: [{ publishAt: { $exists: false } }, { publishAt: { $lte: now } }],
        $and: [{ $or: [{ unpublishAt: { $exists: false } }, { unpublishAt: { $gt: now } }] }],
      })
      .sort({ createdAt: -1 })
      .lean()
      .then((projects) =>
        projects.map(({ _id, ...project }) => ({ ...project, id: _id.toString() })),
      );
  }

  async create(userId: string, input: CreateProjectDto) {
    const data = this.validate(input);
    return this.projects.create({
      ...data,
      userId,
      ...(input.pageId ? { pageId: input.pageId } : {}),
    });
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
    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : undefined;
    if (!input.startDate || Number.isNaN(startDate.getTime()))
      throw new BadRequestException('A valid project start date is required.');
    if (input.endDate && (Number.isNaN(endDate?.getTime()) || endDate! < startDate))
      throw new BadRequestException('The project end date must be after its start date.');
    const skills = Array.isArray(input.skills) ? input.skills : [];
    if (skills.some((skill) => typeof skill !== 'string'))
      throw new BadRequestException('Project skills must be text values.');
    const uniqueSkills = [
      ...new Map(skills.map((skill) => [skill.trim().toLowerCase(), skill.trim()])).values(),
    ]
      .filter((skill) => skill.length > 0 && skill.length <= 50)
      .slice(0, 30);
    const publishAt = input.publishAt ? new Date(input.publishAt) : undefined;
    const unpublishAt = input.unpublishAt ? new Date(input.unpublishAt) : undefined;
    if (input.publishAt && Number.isNaN(publishAt?.getTime()))
      throw new BadRequestException('Invalid publish date.');
    if (input.unpublishAt && Number.isNaN(unpublishAt?.getTime()))
      throw new BadRequestException('Invalid unpublish date.');
    if (publishAt && unpublishAt && unpublishAt <= publishAt)
      throw new BadRequestException('Unpublish date must be after publish date.');
    return {
      title: input.title.trim(),
      summary: input.summary.trim(),
      details: input.details?.trim() ?? '',
      category: input.category.trim(),
      branch: input.branch,
      status,
      progress,
      startDate,
      ...(endDate ? { endDate } : {}),
      skills: uniqueSkills,
      isPublished: input.isPublished === true,
      ...(publishAt ? { publishAt } : {}),
      ...(unpublishAt ? { unpublishAt } : {}),
    };
  }

  private isCurrentlyPublished(project: {
    isPublished?: boolean;
    publishAt?: Date;
    unpublishAt?: Date;
  }): boolean {
    const now = Date.now();
    if (!project.isPublished) return false;
    if (project.publishAt && new Date(project.publishAt).getTime() > now) return false;
    if (project.unpublishAt && new Date(project.unpublishAt).getTime() <= now) return false;
    return true;
  }
}
