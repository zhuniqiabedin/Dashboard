import { Branches } from '../branches.enum';

export class UpdateProfileDto {
  name?: string;
  headline?: string;
  phone?: string;
  location?: string;
  branch?: Branches;
  about?: string;
  skills?: string;
  website?: string;
  experience?: string;
  education?: string;
  photo?: string;
  isPublic?: boolean;
  availability?: string;
  preferredWorkTypes?: string[];
  preferredWorkplace?: string;
}
