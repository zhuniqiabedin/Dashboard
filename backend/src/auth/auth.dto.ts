export class AuthDto {
  email!: string;
  password!: string;
}

export class RegisterDto extends AuthDto {
  name!: string;
}

export class ConfirmInviteDto {
  token!: string;
  password!: string;
}

export class ConfirmEmailDto {
  email!: string;
  code!: string;
}

export class ResendConfirmationDto {
  email!: string;
}
