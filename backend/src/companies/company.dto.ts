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
}
export class UpdateEmployeeRoleDto {
  role!: CompanyRole;
}
