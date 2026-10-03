import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Company, CompanyDocument, CompanyRole } from './company.schema';
import { AddEmployeeDto, CreateCompanyDto, UpdateEmployeeRoleDto } from './company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}
  listMine(userId: string) {
    return this.companies
      .find({ $or: [{ ownerId: userId }, { employeeIds: userId }] })
      .sort({ createdAt: -1 })
      .lean();
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
    company.employees.push({ userId: employee._id, role: input.role ?? 'member' });
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
    if (!['owner', 'admin', 'recruiter', 'member'].includes(input.role))
      throw new BadRequestException('Invalid company role.');
    const employee = company.employees.find((item) => item.userId.toString() === employeeId);
    if (!employee) throw new NotFoundException('Employee not found.');
    employee.role = input.role;
    await company.save();
    return employee;
  }

  private canManage(company: CompanyDocument, userId: string): boolean {
    return (
      company.ownerId.toString() === userId ||
      company.employees.some(
        (employee) => employee.userId.toString() === userId && employee.role === 'admin',
      )
    );
  }
}
