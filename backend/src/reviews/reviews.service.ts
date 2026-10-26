import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../companies/company.schema';
import { JobApplication, JobApplicationDocument } from '../jobs/job-application.schema';
import {
  ProjectApplication,
  ProjectApplicationDocument,
} from '../projects/project-application.schema';
import { Review, ReviewDocument } from './review.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviews: Model<ReviewDocument>,
    @InjectModel(JobApplication.name)
    private readonly jobApplications: Model<JobApplicationDocument>,
    @InjectModel(ProjectApplication.name)
    private readonly projectApplications: Model<ProjectApplicationDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
  ) {}

  async create(userId: string, input: Record<string, unknown>) {
    if (!Types.ObjectId.isValid(String(input.applicationId ?? '')))
      throw new BadRequestException('Choose a valid application.');
    const applicationId = new Types.ObjectId(String(input.applicationId));
    const job = await this.jobApplications.findById(applicationId).lean();
    const project = job ? null : await this.projectApplications.findById(applicationId).lean();
    const application: any = job ?? project;
    if (!application) throw new NotFoundException('Application not found.');
    if (application.status !== 'Completed')
      throw new BadRequestException(
        'Feedback is available after an application is marked Completed.',
      );
    const page = await this.companies.findById(application.pageId).lean();
    if (!page) throw new NotFoundException('Company not found.');
    const companyMember =
      String(page.ownerId) === userId || page.employeeIds.some((id) => String(id) === userId);
    const isCandidate = String(application.userId) === userId;
    if (!companyMember && !isCandidate)
      throw new ForbiddenException('You are not part of this completed work.');
    const direction = isCandidate ? 'candidate_to_company' : 'company_to_candidate';
    if (!isCandidate) {
      const employee: any = page.employees?.find((item: any) => String(item.userId) === userId);
      const roles: string[] = Array.isArray(employee?.roles) ? employee.roles : [employee?.role];
      if (
        String(page.ownerId) !== userId &&
        !roles.some((role) => ['admin', 'recruiter', 'hr'].includes(role))
      )
        throw new ForbiddenException('You cannot leave candidate feedback.');
    }
    const dimensions = ['overall', 'communication', 'delivery', 'collaboration'];
    for (const field of dimensions)
      if (!Number.isInteger(input[field]) || Number(input[field]) < 1 || Number(input[field]) > 5)
        throw new BadRequestException(`${field} rating must be from 1 to 5.`);
    const text = String(input.text ?? '').trim();
    if (text.length > 1200)
      throw new BadRequestException('Feedback must be under 1200 characters.');
    try {
      return await this.reviews.create({
        reviewerId: userId,
        ...(isCandidate
          ? { subjectPageId: application.pageId }
          : { subjectUserId: application.userId }),
        applicationId,
        context: job ? 'job' : 'project',
        direction,
        overall: Number(input.overall),
        communication: Number(input.communication),
        delivery: Number(input.delivery),
        collaboration: Number(input.collaboration),
        text,
      });
    } catch (error) {
      if ((error as any)?.code === 11000)
        throw new BadRequestException(
          'Feedback has already been submitted for this completed work.',
        );
      throw error;
    }
  }

  forUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid user ID.');
    return this.reviews
      .find({ subjectUserId: userId })
      .populate('reviewerId', 'name')
      .sort({ createdAt: -1 })
      .lean();
  }

  forCompany(pageId: string) {
    if (!Types.ObjectId.isValid(pageId)) throw new BadRequestException('Invalid company ID.');
    return this.reviews
      .find({ subjectPageId: pageId })
      .populate('reviewerId', 'name')
      .sort({ createdAt: -1 })
      .lean();
  }
}
