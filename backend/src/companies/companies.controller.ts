import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AddEmployeeDto,
  CreateCompanyDto,
  CreateCompanyGroupDto,
  CreateEmployeeDto,
  UpdateEmployeeGroupDto,
  UpdateEmployeeRoleDto,
} from './company.dto';
import { CompaniesService } from './companies.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}
  @Get('mine') list(@Req() request: AuthenticatedRequest) {
    return this.companies.listMine(request.user.sub);
  }
  @Get(':id/profile') profile(@Param('id') id: string) {
    return this.companies.publicProfile(id);
  }
  @Post() create(@Req() request: AuthenticatedRequest, @Body() input: CreateCompanyDto) {
    return this.companies.create(request.user.sub, input);
  }
  @Post(':id/employees') addEmployee(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: AddEmployeeDto,
  ) {
    return this.companies.addEmployee(request.user.sub, id, input);
  }
  @Post(':id/employees/invite') createEmployee(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: CreateEmployeeDto,
  ) {
    return this.companies.createEmployee(request.user.sub, id, input);
  }
  @Patch(':id/employees/:employeeId/role') updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Body() input: UpdateEmployeeRoleDto,
  ) {
    return this.companies.updateRole(request.user.sub, id, employeeId, input);
  }
  @Patch(':id/employees/:employeeId/group') updateEmployeeGroup(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Body() input: UpdateEmployeeGroupDto,
  ) {
    return this.companies.updateEmployeeGroup(request.user.sub, id, employeeId, input.groupId);
  }
  @Post(':id/groups') createGroup(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: CreateCompanyGroupDto,
  ) {
    return this.companies.createGroup(request.user.sub, id, input.name);
  }
  @Patch(':id/groups/:groupId') renameGroup(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() input: CreateCompanyGroupDto,
  ) {
    return this.companies.renameGroup(request.user.sub, id, groupId, input.name);
  }
  @Delete(':id/groups/:groupId') deleteGroup(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.companies.deleteGroup(request.user.sub, id, groupId);
  }
  @Delete(':id/employees/:employeeId') removeEmployee(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.companies.removeEmployee(request.user.sub, id, employeeId);
  }
}
