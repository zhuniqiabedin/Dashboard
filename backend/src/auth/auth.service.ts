import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthDto, ConfirmInviteDto, RegisterDto } from './auth.dto';
import { User, UserDocument } from '../users/user.schema';
import { Profile, ProfileDocument } from '../profiles/profile.schema';
import { Branches } from '../branches.enum';
import { TokenService } from './token.service';

const scrypt = promisify(scryptCallback);

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    private readonly tokenService: TokenService,
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
    const passwordHash = await this.hashPassword(input.password);
    const user = await this.users.create({ name: input.name.trim(), email, passwordHash });
    await this.profiles.create({
      userId: user._id,
      name: user.name,
      email,
      branch: Branches.Other,
    });
    return this.createSession(user);
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
