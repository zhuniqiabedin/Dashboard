import { Branches } from '../branches.enum';

export class CreateProjectDto {
  title!: string;
  summary!: string;
  details?: string;
  category!: string;
  branch!: Branches;
  status?: 'In progress' | 'Planning';
  progress?: number;
}

export class UpdateProjectDto extends CreateProjectDto {}
