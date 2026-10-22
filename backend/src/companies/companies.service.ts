import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { User, UserDocument } from '../users/user.schema';
import { Job, JobDocument } from '../jobs/job.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { Company, CompanyDocument, CompanyRole } from './company.schema';
import { CompanyGroupDocument, CompanyGroupRecord } from './company-group.schema';
import {
  AddEmployeeDto,
  CreateCompanyDto,
  CreateEmployeeDto,
  UpdateEmployeeRoleDto,
} from './company.dto';
import { Profile, ProfileDocument } from '../profiles/profile.schema';
import { EmailService } from '../mail/email.service';

const scrypt = promisify(scryptCallback);

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(Project.name) private readonly projects: Model<ProjectDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(CompanyGroupRecord.name) private readonly groups: Model<CompanyGroupDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    private readonly email: EmailService,
  ) {}
  async publicProfile(id: string): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Company not found.');
    const company = await this.companies
      .findById(id)
      .select('name description website location logo employeeIds projects projectIds')
      .lean();
    if (!company) throw new NotFoundException('Company not found.');
    const { employeeIds, ...profile } = company;
    const now = new Date();
    const linkedProjectIds = [
      ...new Set([
        ...(company.projects ?? []).map((projectId) => projectId.toString()),
        ...(company.projectIds ?? []).map((projectId) => projectId.toString()),
      ]),
    ]
      .filter(Types.ObjectId.isValid)
      .map((projectId) => new Types.ObjectId(projectId));
    const [projects, jobs] = await Promise.all([
      this.projects
        .find({
          $and: [
            { $or: [{ _id: { $in: linkedProjectIds } }, { pageId: company._id }] },
            { isPublished: true },
            {
              $or: [
                { publishAt: { $exists: false } },
                { publishAt: null },
                { publishAt: { $lte: now } },
              ],
            },
            {
              $or: [
                { unpublishAt: { $exists: false } },
                { unpublishAt: null },
                { unpublishAt: { $gt: now } },
              ],
            },
          ],
        })
        .select(
          'title location summary details category skills hourlyRate startDate endDate publishAt unpublishAt pageId isPublished',
        )
        .sort({ createdAt: -1 })
        .lean(),
      this.jobs
        .find({ pageId: company._id, isPublished: true, status: 'Open' })
        .select('title location description workplace annualSalary skills')
        .sort({ createdAt: -1 })
        .lean(),
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
    // Move groups saved in older company documents into their own collection.
    for (const company of companies) {
      const legacyGroups = (company as any).groups ?? [];
      if (legacyGroups.length) {
        await this.groups.bulkWrite(
          legacyGroups.map((group: { _id: Types.ObjectId; name: string }) => ({
            updateOne: {
              filter: { _id: group._id },
              update: {
                $setOnInsert: {
                  _id: group._id,
                  companyId: company._id,
                  name: group.name,
                  normalizedName: group.name.trim().toLowerCase(),
                },
              },
              upsert: true,
            },
          })),
        );
        await this.companies.updateOne({ _id: company._id }, { $unset: { groups: '' } });
      }
    }
    const companyGroups = await this.groups
      .find({ companyId: { $in: companies.map((company) => company._id) } })
      .select('_id companyId name')
      .lean();
    const groupsByCompany = new Map<string, typeof companyGroups>();
    for (const group of companyGroups) {
      const key = group.companyId.toString();
      groupsByCompany.set(key, [...(groupsByCompany.get(key) ?? []), group]);
    }
    for (const company of companies)
      (company as any).groups = groupsByCompany.get(company._id.toString()) ?? [];
    for (const company of companies)
      for (const employee of company.employees ?? []) {
        const item = employee as any;
        if (!Array.isArray(item.roles) || !item.roles.length) {
          item.roles = [item.role ?? 'member'];
          await this.companies.updateOne(
            { _id: company._id, 'employees.userId': item.userId },
            { $set: { 'employees.$.roles': item.roles } },
          );
        }
      }

    // Backfill the page ID arrays from records that already carry the authoritative pageId.
    const [jobs, projects] = await Promise.all([
      this.jobs
        .find({ pageId: { $in: companies.map((company) => company._id) } })
        .select('_id pageId')
        .lean(),
      this.projects
        .find({ pageId: { $in: companies.map((company) => company._id) } })
        .select('_id pageId')
        .lean(),
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
    await Promise.all(
      companies.map(async (company) => {
        const pageJobs = jobsByPage.get(company._id.toString()) ?? [];
        const pageProjects = projectsByPage.get(company._id.toString()) ?? [];
        if (!pageJobs.length && !pageProjects.length) return;
        await this.companies.updateOne(
          { _id: company._id },
          {
            $addToSet: {
              jobs: { $each: pageJobs },
              projects: { $each: pageProjects },
              projectIds: { $each: pageProjects },
            },
            $unset: { jobIds: '' },
          },
        );
        company.jobs = [...new Set([...(company.jobs ?? []), ...pageJobs])];
        company.projects = [...new Set([...(company.projects ?? []), ...pageProjects])];
        company.projectIds = [...new Set([...(company.projectIds ?? []), ...pageProjects])];
      }),
    );
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
    const roles = [...new Set(input.roles ?? [input.role ?? 'member'])];
    if (roles.some((role) => !['admin', 'recruiter', 'hr', 'member'].includes(role)))
      throw new BadRequestException('Invalid company role.');
    const groupId = await this.validateGroupId(company, input.groupId);
    company.employeeIds.push(employee._id);
    company.employees.push({ userId: employee._id, role: roles[0], roles, groupId });
    await company.save();
    return { id: employee.id, name: employee.name, email: employee.email };
  }

  async createEmployee(userId: string, companyId: string, input: CreateEmployeeDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Employee information is required.');
    const company = await this.companies.findById(companyId);
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage employees.');
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (!name || name.length > 120) throw new BadRequestException('Enter an employee name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException('Enter a valid employee email address.');
    if (await this.users.exists({ email }))
      throw new ConflictException(
        'An account already uses this email. Add the existing employee instead.',
      );
    const roles = [...new Set(input.roles ?? [input.role ?? 'member'])];
    if (
      !roles.length ||
      roles.some((role) => !['admin', 'recruiter', 'hr', 'member'].includes(role))
    )
      throw new BadRequestException('Invalid company role.');
    const groupId = await this.validateGroupId(company, input.groupId);
    await this.email.verifyConfiguration();

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const temporaryPassword = randomBytes(32).toString('base64url');
    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(temporaryPassword, salt, 64)) as Buffer;
    let employee: UserDocument;
    try {
      employee = await this.users.create({
        name,
        email,
        passwordHash: `scrypt$${salt}$${passwordHash.toString('hex')}`,
        emailVerified: false,
        emailConfirmationTokenHash: tokenHash,
        emailConfirmationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException(
          'An account already uses this email. Add the existing employee instead.',
        );
      throw error;
    }

    let profileCreated = false;
    try {
      await this.profiles.create({ userId: employee._id, name, email });
      profileCreated = true;
      company.employeeIds.push(employee._id);
      company.employees.push({ userId: employee._id, role: roles[0], roles, groupId });
      await company.save();
    } catch (error) {
      if (profileCreated) await this.profiles.deleteOne({ userId: employee._id });
      await this.users.deleteOne({ _id: employee._id });
      throw error;
    }

    try {
      await this.email.sendCompanyEmployeeConfirmation(email, name, company.name, token);
    } catch {
      await this.companies.updateOne(
        { _id: company._id },
        { $pull: { employeeIds: employee._id, employees: { userId: employee._id } } },
      );
      await this.profiles.deleteOne({ userId: employee._id });
      await this.users.deleteOne({ _id: employee._id });
      throw new ServiceUnavailableException(
        'The confirmation email could not be sent, so the employee account was not created.',
      );
    }
    return { id: employee.id, name, email, confirmationEmailSent: true };
  }

  async createGroup(userId: string, companyId: string, name: string) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage groups.');
    const normalizedName = this.validateGroupName(name);
    try {
      return await this.groups.create({
        companyId: company._id,
        name: normalizedName,
        normalizedName: normalizedName.toLowerCase(),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('A group with this name already exists.');
      throw error;
    }
  }

  async renameGroup(userId: string, companyId: string, groupId: string, name: string) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage groups.');
    const group = await this.groups.findOne({ _id: groupId, companyId: company._id });
    if (!group) throw new NotFoundException('Company group not found.');
    const normalizedName = this.validateGroupName(name);
    try {
      group.name = normalizedName;
      group.normalizedName = normalizedName.toLowerCase();
      await group.save();
      return group;
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('A group with this name already exists.');
      throw error;
    }
  }

  async deleteGroup(userId: string, companyId: string, groupId: string) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage groups.');
    const group = await this.groups.findOne({ _id: groupId, companyId: company._id });
    if (!group) throw new NotFoundException('Company group not found.');
    await this.companies.updateOne(
      { _id: company._id },
      { $set: { 'employees.$[employee].groupId': null } },
      { arrayFilters: [{ 'employee.groupId': group._id }] },
    );
    await group.deleteOne();
    return { ok: true };
  }

  async updateEmployeeGroup(
    userId: string,
    companyId: string,
    employeeId: string,
    groupId?: string | null,
  ) {
    const company = await this.companies.findOne({ _id: companyId });
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage employees.');
    const employee = company.employees.find((item) => item.userId.toString() === employeeId);
    if (!employee) throw new NotFoundException('Employee not found.');
    employee.groupId = await this.validateGroupId(company, groupId);
    await company.save();
    return employee;
  }

  private validateGroupName(name: string): string {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (!normalizedName || normalizedName.length > 80)
      throw new BadRequestException('Group name is required and must be at most 80 characters.');
    return normalizedName;
  }

  private async validateGroupId(
    company: CompanyDocument,
    groupId?: string | null,
  ): Promise<Types.ObjectId | null> {
    if (!groupId) return null;
    if (!Types.ObjectId.isValid(groupId)) throw new BadRequestException('Invalid company group.');
    const group = await this.groups.findOne({ _id: groupId, companyId: company._id }).select('_id');
    if (!group) throw new BadRequestException('Choose a group belonging to this company.');
    return group._id;
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
    if (
      !roles.length ||
      roles.some((role) => !['owner', 'admin', 'recruiter', 'hr', 'member'].includes(role))
    )
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
    if (!company || !this.canManage(company, userId))
      throw new NotFoundException('Company not found or you cannot manage employees.');
    if (company.ownerId.toString() === employeeId)
      throw new BadRequestException('The company owner cannot be removed.');
    company.employeeIds = company.employeeIds.filter((id) => id.toString() !== employeeId);
    company.employees = company.employees.filter(
      (employee) => employee.userId.toString() !== employeeId,
    );
    await company.save();
    return { ok: true };
  }

  private canManage(company: CompanyDocument, userId: string): boolean {
    return (
      company.ownerId.toString() === userId ||
      company.employees.some(
        (employee) =>
          employee.userId.toString() === userId &&
          (employee.role === 'admin' || employee.roles?.includes('admin')),
      )
    );
  }
}
