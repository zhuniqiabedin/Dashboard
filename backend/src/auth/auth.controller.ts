import { Body, Controller, Post } from '@nestjs/common';
import {
  AuthDto,
  ConfirmEmailDto,
  ConfirmInviteDto,
  RegisterDto,
  ResendConfirmationDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterDto) {
    return this.authService.register(input);
  }

  @Post('confirm-email') confirmEmail(@Body() input: ConfirmEmailDto) {
    return this.authService.confirmRegistrationEmail(input);
  }

  @Post('resend-confirmation') resendConfirmation(@Body() input: ResendConfirmationDto) {
    return this.authService.resendRegistrationConfirmation(input);
  }

  @Post('confirm-invite')
  confirmInvite(@Body() input: ConfirmInviteDto) {
    return this.authService.confirmCompanyInvite(input);
  }

  @Post('login')
  login(@Body() input: AuthDto) {
    return this.authService.login(input);
  }
}
