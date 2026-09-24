export class AuthDto {
  email!: string;
  password!: string;
}

export class RegisterDto extends AuthDto {
  name!: string;
}
