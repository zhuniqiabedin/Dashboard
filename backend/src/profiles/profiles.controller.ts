import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMine(@Req() request: AuthenticatedRequest) {
    return this.profilesService.getMine(request.user.sub);
  }

  @Patch('me')
  updateMine(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileDto) {
    return this.profilesService.updateMine(request.user.sub, input);
  }
}
