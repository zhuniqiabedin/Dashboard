import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import {
  AuthDto,
  ConfirmEmailDto,
  ConfirmInviteDto,
  RegisterDto,
  ResendConfirmationDto,
} from './auth.dto';
import { User, UserDocument } from '../users/user.schema';
import { Profile, ProfileDocument } from '../profiles/profile.schema';
import { Branches } from '../branches.enum';
import { TokenService } from './token.service';
import { EmailService } from '../mail/email.service';

const scrypt = promisify(scryptCallback);

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    private readonly tokenService: TokenService,
    private readonly email: EmailService,
  ) {}

  async register(input: RegisterDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Registration data is required.');
    this.validateCredentials(input.email, input.password);
    if (typeof input.name !== 'string' || !input.name.trim()) {
      throw new BadRequestException('Name is required.');
    }
    const email = input.email.trim().toLowerCase();
    if (await this.users.exists({ email }))
      throw new ConflictException('That email is already registered.');
    await this.email.verifyConfiguration();
    const passwordHash = await this.hashPassword(input.password);
    const name = input.name.trim();
    const code = String(randomInt(100000, 1000000));
    let user: UserDocument;
    try {
      user = await this.users.create({
        name,
        email,
        passwordHash,
        emailVerified: false,
        emailConfirmationCodeHash: createHash('sha256').update(code).digest('hex'),
        emailConfirmationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        emailConfirmationCodeAttempts: 0,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('That email is already registered.');
      throw error;
    }
    let profileCreated = false;
    try {
      await this.profiles.create({ userId: user._id, name, email, branch: Branches.Other });
      profileCreated = true;
      await this.email.sendRegistrationConfirmation(email, name, code);
    } catch {
      if (profileCreated) await this.profiles.deleteOne({ userId: user._id });
      await this.users.deleteOne({ _id: user._id });
      throw new ServiceUnavailableException(
        'We could not send the confirmation email. Check your email settings and try again.',
      );
    }
    return { confirmationRequired: true, email };
  }

  async confirmRegistrationEmail(input: ConfirmEmailDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Confirmation data is required.');
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(input.code ?? ''))
      throw new BadRequestException('Enter the email address and 6-digit confirmation code.');
    const user = await this.users
      .findOne({ email, emailVerified: false })
      .select('+emailConfirmationCodeHash +emailConfirmationCodeExpiresAt +emailConfirmationCodeAttempts');
    if (!user || !user.emailConfirmationCodeHash || !user.emailConfirmationCodeExpiresAt ||
      user.emailConfirmationCodeExpiresAt <= new Date())
      throw new BadRequestException('The confirmation code is invalid or expired.');
    if ((user.emailConfirmationCodeAttempts ?? 0) >= 5)
      throw new BadRequestException('Too many incorrect codes. Request a new confirmation code.');
    const submittedHash = createHash('sha256').update(input.code).digest();
    const savedHash = Buffer.from(user.emailConfirmationCodeHash, 'hex');
    if (!timingSafeEqual(submittedHash, savedHash)) {
      user.emailConfirmationCodeAttempts = (user.emailConfirmationCodeAttempts ?? 0) + 1;
      await user.save();
      throw new BadRequestException('The confirmation code is incorrect.');
    }
    user.emailVerified = true;
    user.emailConfirmationCodeHash = undefined;
    user.emailConfirmationCodeExpiresAt = undefined;
    user.emailConfirmationCodeAttempts = 0;
    await user.save();
    return { ok: true };
  }

  async resendRegistrationConfirmation(input: ResendConfirmationDto) {
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException('Enter a valid email address.');
    const user = await this.users.findOne({
      email,
      emailVerified: false,
      emailConfirmationCodeHash: { $exists: true },
    });
    if (!user) return { ok: true };
    await this.email.verifyConfiguration();
    const code = String(randomInt(100000, 1000000));
    user.emailConfirmationCodeHash = createHash('sha256').update(code).digest('hex');
    user.emailConfirmationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.emailConfirmationCodeAttempts = 0;
    await user.save();
    try {
      await this.email.sendRegistrationConfirmation(email, user.name, code);
    } catch {
      throw new ServiceUnavailableException('Could not send a new confirmation email. Try again.');
    }
    return { ok: true };
  }

  async login(input: AuthDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Login data is required.');
    this.validateCredentials(input.email, input.password);
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findOne({ email }).select('+passwordHash');
    if (!user || !(await this.verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    if (!user.emailVerified)
      throw new UnauthorizedException('Confirm your email before signing in.');
    return this.createSession(user);
  }

  async confirmCompanyInvite(input: ConfirmInviteDto) {
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Confirmation data is required.');
    if (typeof input.token !== 'string' || input.token.length < 32)
      throw new BadRequestException('This confirmation link is invalid or expired.');
    this.validatePassword(input.password);
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const user = await this.users
      .findOne({
        emailConfirmationTokenHash: tokenHash,
        emailConfirmationExpiresAt: { $gt: new Date() },
        emailVerified: false,
      })
      .select('+emailConfirmationTokenHash +emailConfirmationExpiresAt');
    if (!user) throw new BadRequestException('This confirmation link is invalid or expired.');
    user.passwordHash = await this.hashPassword(input.password);
    user.emailVerified = true;
    user.emailConfirmationTokenHash = undefined;
    user.emailConfirmationExpiresAt = undefined;
    await user.save();
    return { ok: true };
  }

  private async createSession(user: UserDocument) {
    const accessToken = this.tokenService.sign({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  private validateCredentials(email: unknown, password: unknown): asserts email is string {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    this.validatePassword(password);
  }

  private validatePassword(password: unknown): asserts password is string {
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      throw new BadRequestException('Password must be between 8 and 200 characters.');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${hash.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [algorithm, salt, hashHex] = stored.split('$');
    if (algorithm !== 'scrypt' || !salt || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
