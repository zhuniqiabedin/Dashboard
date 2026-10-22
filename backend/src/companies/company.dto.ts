export class CreateCompanyDto {
  name!: string;
  description!: string;
  website?: string;
  location?: string;
  logo?: string;
}
import { CompanyRole } from './company.schema';
export class AddEmployeeDto {
  email!: string;
  role?: CompanyRole;
  roles?: CompanyRole[];
  groupId?: string | null;
}
export class CreateEmployeeDto extends AddEmployeeDto {
  name!: string;
}
export class UpdateEmployeeRoleDto {
  role!: CompanyRole;
  roles?: CompanyRole[];
}
export class CreateCompanyGroupDto {
  name!: string;
}
export class UpdateEmployeeGroupDto {
  groupId?: string | null;
}
