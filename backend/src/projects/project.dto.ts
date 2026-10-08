import { Branches } from '../branches.enum';

export class CreateProjectDto {
  pageId?: string;
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
  hourlyRate?: number;
  isPublished?: boolean;
  publishAt?: string;
  unpublishAt?: string;
}

export class UpdateProjectDto extends CreateProjectDto {}
