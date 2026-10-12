import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../companies/company.schema';
import { CreateJobDto } from './job.dto';
import { Profile, ProfileDocument } from '../profiles/profile.schema';
import { JobApplication, JobApplicationDocument } from './job-application.schema';
import { Job, JobDocument } from './job.schema';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    @InjectModel(JobApplication.name) private readonly applications: Model<JobApplicationDocument>,
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    private readonly notifications: NotificationsService,
  ) {}
  private async requireCompany(userId: string, pageId: string) {
    if (typeof pageId !== 'string' || !Types.ObjectId.isValid(pageId)) throw new BadRequestException('A valid company pageId is required.');
    const company = await this.companies.findOne({ _id: pageId, $or: [{ ownerId: userId }, { employeeIds: userId }] }).lean();
    if (!company) throw new NotFoundException('Company not found or you do not have access.');
    return company;
  }
  async listPublished(userId: string): Promise<Record<string, unknown>[]> {
    const jobs = await this.jobs.find({ isPublished: true, status: 'Open' })
      .select('title location description annualSalary workplace skills pageId createdAt')
      .populate<{ pageId: { _id: Types.ObjectId; name: string } | null }>('pageId', 'name')
      .sort({ createdAt: -1 }).lean();
    const applied = await this.applications.find({ userId, jobId: { $in: jobs.map((job) => job._id) } }).select('jobId').lean();
    const appliedIds = new Set(applied.map((application) => application.jobId.toString()));
    return jobs.filter((job) => job.pageId).map((job) => ({
      ...job, hasApplied: appliedIds.has(job._id.toString()), pageId: job.pageId!._id.toString(), companyName: job.pageId!.name,
    }));
  }
  async apply(userId: string, id: string): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid job ID.');
    const job = await this.jobs.findOne({ _id: id, isPublished: true, status: 'Open' }).lean();
    if (!job || !(await this.companies.exists({ _id: job.pageId }))) throw new NotFoundException('This job is no longer accepting applications.');
    try {
      const existed = await this.applications.exists({ jobId: job._id, userId });
      const application = await this.applications.findOneAndUpdate(
        { jobId: job._id, userId },
        { $setOnInsert: { jobId: job._id, userId, pageId: job.pageId, status: 'Submitted' } },
        { upsert: true, new: true, runValidators: true },
      ).lean();
      if (!existed) {
        const profile = await this.profiles.findOne({ userId }).select('name').lean();
        await this.notifications.application(job.pageId, 'job_application', job._id, application!._id, profile?.name || 'Someone');
      }
      return { id: application!._id.toString(), status: application!.status };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return { status: 'Submitted' };
      throw error;
    }
  }
  async listApplicants(userId: string, id: string): Promise<Record<string, unknown>[]> {
    const job = await this.requireJob(userId, id);
    const company = await this.companies.findById(job.pageId).lean();
    const employee: any = company?.employees?.find((item: any) => String(item.userId) === userId);
    const roles: string[] = Array.isArray(employee?.roles) ? employee.roles : [employee?.role];
    if (String(company?.ownerId) !== userId && !roles.some((role) => ['admin', 'recruiter', 'hr'].includes(role))) throw new ForbiddenException('You cannot view applicant details.');
    // The job is the source of truth for its company. Older applications may have
    // a missing or string-typed pageId, so don't hide them behind that field.
    await this.applications.updateMany(
      { jobId: job._id },
      { $set: { pageId: job.pageId } },
    );
    const applications = await this.applications.find({ jobId: job._id })
      .populate<{ userId: { _id: Types.ObjectId; name: string; email: string } | null }>('userId', 'name email').sort({ createdAt: -1 }).lean();
    const profiles = await this.profiles.find({ userId: { $in: applications.flatMap((item) => item.userId ? [item.userId._id] : []) } })
      .select('userId headline location phone skills about experience education website branch photo').lean();
    const byUser = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
    return applications.map((application) => ({
      ...application,
      profile: application.userId ? byUser.get(application.userId._id.toString()) ?? null : null,
    }));
  }
  async listMyApplications(userId: string) {
    const applications = await this.applications.find({ userId }).sort({ createdAt: -1 }).populate('jobId').populate('pageId', 'name').lean();
    return applications.map((application: any) => ({ ...application, job: application.jobId, company: application.pageId }));
  }
  async listForPage(userId: string, pageId: string) {
    const company = await this.requireCompany(userId, pageId);
    const pageJobs = await this.jobs.find({ pageId: company._id }).select('_id').lean();
    const linkedIds = [...new Set([
      ...(company.jobs ?? []).map((id) => id.toString()),
      ...pageJobs.map((job) => job._id.toString()),
    ])].map((id) => new Types.ObjectId(id));
    const linkedIdStrings = new Set((company.jobs ?? []).map((id) => id.toString()));
    const hasUnlinkedPageJobs = pageJobs.some((job) => !linkedIdStrings.has(job._id.toString()));

    await this.companies.updateOne(
      { _id: company._id },
      {
        ...(hasUnlinkedPageJobs ? { $addToSet: { jobs: { $each: linkedIds } } } : {}),
        $unset: { jobIds: '' },
      },
    );
    return this.jobs.find({ _id: { $in: linkedIds }, pageId: company._id }).sort({ createdAt: -1 }).lean();
  }
  private validate(input: CreateJobDto) {
    if (!input || typeof input.title !== 'string' || !input.title.trim() || typeof input.location !== 'string' || !input.location.trim()) throw new BadRequestException('Page, job title, and location are required.');
    if (input.title.trim().length > 120 || input.location.trim().length > 120) throw new BadRequestException('Title and location must be at most 120 characters.');
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 1000)) throw new BadRequestException('Description must be text of at most 1000 characters.');
    if (input.status !== undefined && !['Open', 'Closed'].includes(input.status)) throw new BadRequestException('Invalid job status.');
    const annualSalary = input.annualSalary ?? 0;
    const workplace = input.workplace ?? 'Onsite';
    if (typeof annualSalary !== 'number' || !Number.isFinite(annualSalary) || annualSalary < 0) throw new BadRequestException('Annual salary must be a non-negative number.');
    if (!['Remote', 'Hybrid', 'Onsite'].includes(workplace)) throw new BadRequestException('Choose Remote, Hybrid, or Onsite.');
    if (input.skills !== undefined && (!Array.isArray(input.skills) || input.skills.some((skill) => typeof skill !== 'string'))) throw new BadRequestException('Skills must be a list of text values.');
    const skills = (input.skills ?? []).map((skill) => skill.trim()).filter(Boolean);
    const uniqueSkills = skills.filter((skill, index) => skills.findIndex((item) => item.toLowerCase() === skill.toLowerCase()) === index);
    if (input.isPublished !== undefined && typeof input.isPublished !== 'boolean') throw new BadRequestException('Publication status must be true or false.');
    return { title: input.title.trim(), location: input.location.trim(), description: input.description?.trim() ?? '', status: input.status ?? 'Open', annualSalary, workplace, skills: uniqueSkills, isPublished: input.isPublished ?? false };
  }
  async create(userId: string, input: CreateJobDto) {
    const data = this.validate(input);
    const company = await this.requireCompany(userId, input.pageId);
    const job = await this.jobs.create({ ...data, userId, pageId: company._id });
    await this.companies.updateOne(
      { _id: company._id },
      { $addToSet: { jobs: job._id } },
    );
    return job;
  }
  private async requireJob(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid job ID.');
    const job = await this.jobs.findById(id).lean();
    if (!job) throw new NotFoundException('Job not found.');
    await this.requireCompany(userId, job.pageId.toString());
    return job;
  }
  async update(userId: string, id: string, input: Partial<CreateJobDto>) {
    const job = await this.requireJob(userId, id);
    if (!input || typeof input !== 'object') throw new BadRequestException('Job data is required.');
    if (input.pageId !== undefined && input.pageId !== job.pageId.toString()) throw new BadRequestException('A job cannot be moved to another company.');
    const data = this.validate({ ...job, ...input, pageId: job.pageId.toString() });
    const updated = await this.jobs.findOneAndUpdate({ _id: id, pageId: job.pageId }, { $set: data }, { new: true, runValidators: true });
    if (!updated) throw new NotFoundException('Job not found.');
    await this.companies.updateOne(
      { _id: job.pageId },
      { $addToSet: { jobs: job._id } },
    );
    return updated;
  }
  async remove(userId: string, id: string) {
    const job = await this.requireJob(userId, id);
    await this.jobs.deleteOne({ _id: id, pageId: job.pageId });
    await this.companies.updateOne(
      { _id: job.pageId },
      { $pull: { jobs: job._id } },
    );
    return { deleted: true };
  }

}

