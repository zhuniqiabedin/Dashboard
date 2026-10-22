import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branches } from '../branches.enum';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { Project, ProjectDocument } from './project.schema';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Profile, ProfileDocument } from '../profiles/profile.schema';
import { ProjectApplication, ProjectApplicationDocument } from './project-application.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projects: Model<ProjectDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    @InjectModel(ProjectApplication.name) private readonly applications: Model<ProjectApplicationDocument>,
    private readonly notifications: NotificationsService,
  ) {}

  async matchingUsers(projectId: string, userId: string): Promise<Record<string, unknown>[]> {
    await this.requireCompanyProject(userId, projectId);
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

  async matchingProjectsForEmployee(userId: string, pageId: string, employeeId: string): Promise<Record<string, unknown>[]> {
    if (!Types.ObjectId.isValid(pageId) || !Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid company or employee ID.');
    }
    const company = await this.companies.findOne({ _id: pageId, $or: [{ ownerId: userId }, { employeeIds: userId }] }).lean();
    if (!company) throw new ForbiddenException('You do not have access to this company.');
    if (!company.employeeIds.some((id) => id.toString() === employeeId)) {
      throw new ForbiddenException('You can only search projects for an employee of this company.');
    }
    const profile = await this.profiles.findOne({ userId: employeeId }).select('name skills').lean();
    const rawSkills = String(profile?.skills ?? '').trim();
    let employeeSkills: string[];
    try {
      const parsed = JSON.parse(rawSkills);
      employeeSkills = Array.isArray(parsed) ? parsed.map(String) : rawSkills.split(',');
    } catch {
      employeeSkills = rawSkills.split(',');
    }
    const skillSet = new Set(employeeSkills.map((skill) => skill.toLowerCase().trim()).filter(Boolean));
    const now = new Date();
    const published = await this.projects.find({
      pageId: { $exists: true, $nin: [null, new Types.ObjectId(pageId)] },
      isPublished: true,
      $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }],
      $and: [{ $or: [{ unpublishAt: { $exists: false } }, { unpublishAt: null }, { unpublishAt: { $gt: now } }] }],
    }).populate('pageId', 'name').sort({ createdAt: -1 }).lean();
    return published.map((project: any) => {
      const matchedSkills = (project.skills ?? []).filter((skill: string) => skillSet.has(String(skill).toLowerCase().trim()));
      return {
        id: project._id.toString(),
        employeeName: profile?.name || 'Company employee',
        title: project.title,
        summary: project.summary,
        details: project.details,
        category: project.category,
        branch: project.branch,
        skills: project.skills ?? [],
        pageId: project.pageId?._id?.toString(),
        pageName: project.pageId?.name ?? 'Company',
        matchedSkills,
        match: skillSet.size ? Math.round((matchedSkills.length / skillSet.size) * 100) : 0,
      };
    }).sort((a, b) => b.match - a.match);
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

  async apply(userId: string, id: string, cvSnapshot: Record<string, unknown> = {}) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid project ID.');
    const project = await this.projects.findById(id).lean();
    if (!project || !project.pageId || !this.isCurrentlyPublished(project)) throw new NotFoundException('This project is not accepting applications.');
    const profile = await this.profiles.findOne({ userId }).lean();
    if (!profile) throw new BadRequestException('Complete your profile before applying.');
    const safeCv = cvSnapshot && typeof cvSnapshot === 'object' ? cvSnapshot : {};
    let application;
    try {
      application = await this.applications.create({ projectId: project._id, pageId: project.pageId, userId, profileSnapshot: profile, cvSnapshot: safeCv });
    } catch (error) {
      if ((error as any)?.code === 11000) return { status: 'Submitted', alreadyApplied: true };
      throw error;
    }
    await this.notifications.application(project.pageId, 'project_application', project._id, application._id, profile.name || 'Someone');
    return { id: application.id, status: application.status };
  }

  async applyForEmployee(applyingUserId: string, projectId: string, pageId: string, employeeId: string) {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(pageId) || !Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid project, company, or employee ID.');
    }
    const company = await this.companies.findOne({ _id: pageId, $or: [{ ownerId: applyingUserId }, { employeeIds: applyingUserId }] }).lean();
    if (!company) throw new ForbiddenException('You do not have access to this company.');
    if (!company.employeeIds.some((id) => id.toString() === employeeId)) {
      throw new ForbiddenException('You can only apply for an employee of this company.');
    }
    const project = await this.projects.findById(projectId).lean();
    if (!project || !project.pageId || !this.isCurrentlyPublished(project)) {
      throw new NotFoundException('This project is not accepting applications.');
    }
    if (project.pageId.toString() === pageId) {
      throw new ForbiddenException('You cannot apply for an employee to a project published by your own company.');
    }
    const profile = await this.profiles.findOne({ userId: employeeId }).lean();
    if (!profile) throw new BadRequestException('The selected employee needs a profile before applying.');
    try {
      const application = await this.applications.create({
        projectId: project._id,
        pageId: project.pageId,
        userId: employeeId,
        profileSnapshot: profile,
        cvSnapshot: { skills: profile.skills ?? '' },
      });
      await this.notifications.application(project.pageId, 'project_application', project._id, application._id, profile.name || 'Someone');
      return { id: application.id, status: application.status };
    } catch (error) {
      if ((error as any)?.code === 11000) return { status: 'Submitted', alreadyApplied: true };
      throw error;
    }
  }

  async listMyApplications(userId: string) {
    const apps = await this.applications.find({ userId }).sort({ createdAt: -1 }).populate('projectId').populate('pageId', 'name').lean();
    return apps.map((app: any) => ({ ...app, project: app.projectId, company: app.pageId }));
  }

  async listApplicants(userId: string, id: string) {
    const project = await this.requireCompanyProject(userId, id);
    const company = await this.companies.findById(project.pageId).lean();
    const memberRoles = company?.employees?.find((e: any) => String(e.userId) === userId);
    const roles = Array.isArray((memberRoles as any)?.roles) ? (memberRoles as any).roles : [(memberRoles as any)?.role];
    if (String(company?.ownerId) !== userId && !roles.some((role: string) => ['admin', 'recruiter', 'hr'].includes(role))) throw new ForbiddenException('You cannot view applicant details.');
    return this.applications.find({ projectId: project._id }).populate('userId', 'name email').sort({ createdAt: -1 }).lean();
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
      .populate<{ pageId: { _id: Types.ObjectId; name: string } | null }>('pageId', 'name')
      .sort({ createdAt: -1 })
      .lean()
      .then((projects) =>
        projects.filter((project) => project.pageId).map(({ _id, pageId, ...project }) => ({ ...project, id: _id.toString(), pageId: pageId!._id.toString(), pageName: pageId!.name })),
      );
  }

  private async requireCompany(userId: string, pageId?: string) {
    if (!pageId || !Types.ObjectId.isValid(pageId)) throw new ForbiddenException('Projects must belong to a company you manage.');
    const company = await this.companies.findOne({ _id: pageId, $or: [{ ownerId: userId }, { employeeIds: userId }] }).lean();
    if (!company) throw new ForbiddenException('You do not have access to this company.');
    return company;
  }
  private async requireCompanyProject(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid project ID.');
    const project = await this.projects.findById(id).lean();
    if (!project) throw new NotFoundException('Project not found.');
    await this.requireCompany(userId, project.pageId?.toString());
    return project;
  }
  async create(userId: string, input: CreateProjectDto) {
    const data = this.validate(input);
    const company = await this.requireCompany(userId, input.pageId);
    const project = await this.projects.create({
      ...data,
      userId,
      pageId: company._id,
    });
    await this.companies.updateOne(
      { _id: company._id },
      { $addToSet: { projects: project._id, projectIds: project._id } },
    );
    return project;
  }

  async update(userId: string, id: string, input: UpdateProjectDto) {
    const existing = await this.requireCompanyProject(userId, id);
    if (input.pageId && input.pageId !== existing.pageId?.toString()) throw new BadRequestException('A project cannot be moved to another company.');
    const project = await this.projects
      .findOneAndUpdate(
        { _id: id, pageId: existing.pageId },
        { $set: this.validate(input) },
        { new: true, runValidators: true },
      )
      .lean();
    if (!project) throw new NotFoundException('Project not found.');
    await this.companies.updateOne(
      { _id: existing.pageId },
      { $addToSet: { projects: existing._id, projectIds: existing._id } },
    );
    return project;
  }

  async remove(userId: string, id: string) {
    const project = await this.requireCompanyProject(userId, id);
    const result = await this.projects.deleteOne({ _id: id, pageId: project.pageId });
    if (!result.deletedCount) throw new NotFoundException('Project not found.');
    await this.companies.updateOne(
      { _id: project.pageId },
      { $pull: { projects: project._id, projectIds: project._id } },
    );
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
    if (
      input.location !== undefined &&
      (typeof input.location !== 'string' || input.location.length > 160)
    ) {
      throw new BadRequestException('Project location must be text under 160 characters.');
    }
    if (typeof input.category !== 'string' || !input.category.trim()) {
      throw new BadRequestException('Project category is required.');
    }
    if (!Object.values(Branches).includes(input.branch))
      throw new BadRequestException('Invalid branch.');
    const status = input.status ?? 'Planning';
    const progress = input.progress ?? 0;
    const hourlyRate = input.hourlyRate ?? 0;
    if (
      !['In progress', 'Planning'].includes(status) ||
      !Number.isInteger(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      throw new BadRequestException('Invalid project status or progress.');
    }
    if (typeof hourlyRate !== 'number' || !Number.isFinite(hourlyRate) || hourlyRate < 0)
      throw new BadRequestException('Hourly rate must be a non-negative number.');
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
      location: input.location?.trim() ?? '',
      summary: input.summary.trim(),
      details: input.details?.trim() ?? '',
      category: input.category.trim(),
      branch: input.branch,
      status,
      progress,
      hourlyRate,
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
