import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

type TokenPayload = { sub: string; email: string; exp: number };

@Injectable()
export class TokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  sign(payload: Omit<TokenPayload, 'exp'>): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const body = this.encode({ ...payload, exp: Math.floor(Date.now() / 1000) + 86_400 });
    const content = `${header}.${body}`;
    return `${content}.${this.signature(content)}`;
  }

  verify(token: string): TokenPayload {
    const [header, body, signature, extra] = token.split('.');
    if (!header || !body || !signature || extra)
      throw new UnauthorizedException('Invalid session.');
    const content = `${header}.${body}`;
    const expected = Buffer.from(this.signature(content));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Invalid session.');
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (
      !payload.sub ||
      !payload.email ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() / 1000
    ) {
      throw new UnauthorizedException('Session expired.');
    }
    return payload;
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}
