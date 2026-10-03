import { Branches } from '../branches.enum';

export class CreateProjectDto {
  title!: string;
  summary!: string;
  details?: string;
  category!: string;
  branch!: Branches;
  status?: 'In progress' | 'Planning';
  progress?: number;
  startDate!: string;
  endDate?: string;
  skills?: string[];
}

export class UpdateProjectDto extends CreateProjectDto {}
