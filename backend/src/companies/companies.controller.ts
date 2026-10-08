import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddEmployeeDto, CreateCompanyDto, UpdateEmployeeRoleDto } from './company.dto';
import { CompaniesService } from './companies.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}
  @Get('mine') list(@Req() request: AuthenticatedRequest) {
    return this.companies.listMine(request.user.sub);
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
  @Patch(':id/employees/:employeeId/role') updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Body() input: UpdateEmployeeRoleDto,
  ) {
    return this.companies.updateRole(request.user.sub, id, employeeId, input);
  }
  @Delete(':id/employees/:employeeId') removeEmployee(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.companies.removeEmployee(request.user.sub, id, employeeId);
  }
}
