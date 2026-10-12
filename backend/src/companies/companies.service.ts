import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Job, JobDocument } from '../jobs/job.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { Company, CompanyDocument, CompanyRole } from './company.schema';
import { AddEmployeeDto, CreateCompanyDto, UpdateEmployeeRoleDto } from './company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(Project.name) private readonly projects: Model<ProjectDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}
  async publicProfile(id: string): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Company not found.');
    const company = await this.companies.findById(id).select('name description website location logo employeeIds projects projectIds').lean();
    if (!company) throw new NotFoundException('Company not found.');
    const { employeeIds, ...profile } = company;
    const now = new Date();
    const linkedProjectIds = [...new Set([
      ...(company.projects ?? []).map((projectId) => projectId.toString()),
      ...(company.projectIds ?? []).map((projectId) => projectId.toString()),
    ])]
      .filter(Types.ObjectId.isValid)
      .map((projectId) => new Types.ObjectId(projectId));
    const [projects, jobs] = await Promise.all([
      this.projects.find({
        $and: [
          { $or: [{ _id: { $in: linkedProjectIds } }, { pageId: company._id }] },
          { isPublished: true },
          { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
          { $or: [{ unpublishAt: { $exists: false } }, { unpublishAt: null }, { unpublishAt: { $gt: now } }] },
        ],
      }).select('title summary details category skills hourlyRate startDate endDate publishAt unpublishAt pageId isPublished').sort({ createdAt: -1 }).lean(),
      this.jobs.find({ pageId: company._id, isPublished: true, status: 'Open' })
        .select('title location description workplace annualSalary skills').sort({ createdAt: -1 }).lean(),
    ]);
    return { ...profile, employeeCount: employeeIds?.length ?? 0, projects, jobs };
  }
  async listMine(userId: string) {
    const companies = await this.companies
      .find({ $or: [{ ownerId: userId }, { employeeIds: userId }] })
      .populate('employees.userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    if (!companies.length) return companies;
    for (const company of companies) for (const employee of company.employees ?? []) {
      const item = employee as any;
      if (!Array.isArray(item.roles) || !item.roles.length) {
        item.roles = [item.role ?? 'member'];
        await this.companies.updateOne({ _id: company._id, 'employees.userId': item.userId }, { $set: { 'employees.$.roles': item.roles } });
      }
    }

    // Backfill the page ID arrays from records that already carry the authoritative pageId.
    const [jobs, projects] = await Promise.all([
      this.jobs.find({ pageId: { $in: companies.map((company) => company._id) } }).select('_id pageId').lean(),
      this.projects.find({ pageId: { $in: companies.map((company) => company._id) } }).select('_id pageId').lean(),
    ]);
    const jobsByPage = new Map<string, Types.ObjectId[]>();
    const projectsByPage = new Map<string, Types.ObjectId[]>();
    for (const job of jobs) {
      const key = job.pageId.toString();
      jobsByPage.set(key, [...(jobsByPage.get(key) ?? []), job._id]);
    }
    for (const project of projects) {
      if (!project.pageId) continue;
      const key = project.pageId.toString();
      projectsByPage.set(key, [...(projectsByPage.get(key) ?? []), project._id]);
    }
    await Promise.all(companies.map(async (company) => {
      const pageJobs = jobsByPage.get(company._id.toString()) ?? [];
      const pageProjects = projectsByPage.get(company._id.toString()) ?? [];
      if (!pageJobs.length && !pageProjects.length) return;
      await this.companies.updateOne(
        { _id: company._id },
        { $addToSet: {
          jobs: { $each: pageJobs },
          projects: { $each: pageProjects }, projectIds: { $each: pageProjects },
        }, $unset: { jobIds: '' } },
      );
      company.jobs = [...new Set([...(company.jobs ?? []), ...pageJobs])];
      company.projects = [...new Set([...(company.projects ?? []), ...pageProjects])];
      company.projectIds = [...new Set([...(company.projectIds ?? []), ...pageProjects])];
    }));
    await this.companies.updateMany(
      { _id: { $in: companies.map((company) => company._id) } },
      { $unset: { jobIds: '' } },
    );
    return companies;
  }
  async create(userId: string, input: CreateCompanyDto) {
    if ((await this.companies.countDocuments({ ownerId: userId })) >= 2)
      throw new BadRequestException('You can create a maximum of 2 companies.');
    if (!input.name?.trim()) throw new BadRequestException('Company name is required.');
    if (!input.description?.trim())
      throw new BadRequestException('Company description is required.');
    return this.companies.create({
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      ownerId: userId,
      employeeIds: [userId],
      employees: [{ userId, role: 'owner' }],
    });
  }
  async addEmployee(userId: string, companyId: string, input: AddEmployeeDto) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage employees.');
    const employee = await this.users.findOne({ email: input.email?.trim().toLowerCase() });
    if (!employee) throw new NotFoundException('No user exists with that email.');
    if (company.employeeIds.some((id) => id.toString() === employee.id))
      throw new ConflictException('This user is already an employee.');
    company.employeeIds.push(employee._id);
    const roles = [...new Set(input.roles ?? [input.role ?? 'member'])];
    if (roles.some((role) => !['admin', 'recruiter', 'hr', 'member'].includes(role))) throw new BadRequestException('Invalid company role.');
    company.employees.push({ userId: employee._id, role: roles[0], roles });
    await company.save();
    return { id: employee.id, name: employee.name, email: employee.email };
  }

  async updateRole(
    userId: string,
    companyId: string,
    employeeId: string,
    input: UpdateEmployeeRoleDto,
  ) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage employees.');
    const roles = [...new Set(input.roles ?? (input.role ? [input.role] : []))];
    if (!roles.length || roles.some((role) => !['owner', 'admin', 'recruiter', 'hr', 'member'].includes(role)))
      throw new BadRequestException('Invalid company role.');
    const employee = company.employees.find((item) => item.userId.toString() === employeeId);
    if (!employee) throw new NotFoundException('Employee not found.');
    employee.roles = roles;
    employee.role = roles[0];
    await company.save();
    return employee;
  }
  async removeEmployee(userId: string, companyId: string, employeeId: string) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId)) throw new NotFoundException('Company not found or you cannot manage employees.');
    if (company.ownerId.toString() === employeeId) throw new BadRequestException('The company owner cannot be removed.');
    company.employeeIds = company.employeeIds.filter((id) => id.toString() !== employeeId);
    company.employees = company.employees.filter((employee) => employee.userId.toString() !== employeeId);
    await company.save();
    return { ok: true };
  }

  private canManage(company: CompanyDocument, userId: string): boolean {
    return (
      company.ownerId.toString() === userId ||
      company.employees.some(
        (employee) => employee.userId.toString() === userId && (employee.role === 'admin' || employee.roles?.includes('admin')),
      )
    );
  }
}
