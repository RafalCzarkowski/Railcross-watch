import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const qrcode = require('qrcode') as typeof import('qrcode');
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { OAuthProfile } from './types/oauth-profile.interface';

type UserWithMfa = User & { mfaEnabled: boolean; mfaSecret: string | null };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });
  }

  async validateLocalUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, jti: randomUUID() };
    return this.jwtService.sign(payload);
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: Number(this.config.get('JWT_EXPIRATION_SECONDS', 86400)),
    };
  }

  async generateMfaSecret(user: User): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const db = this.prisma.user as any;
    const secretObj = speakeasy.generateSecret({ length: 20, name: `railcross-watch (${user.email})` });
    const secret = secretObj.base32;
    await db.update({ where: { id: user.id }, data: { mfaSecret: secret } });
    const otpAuthUrl = speakeasy.otpauthURL({
      secret,
      label: user.email,
      issuer: 'railcross-watch',
      encoding: 'base32',
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);
    return { secret, qrCodeDataUrl };
  }

  async enableMfa(userId: string, code: string): Promise<void> {
    const db = this.prisma.user as any;
    const user: UserWithMfa = await db.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new UnauthorizedException('MFA setup not started');
    const valid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    await db.update({ where: { id: userId }, data: { mfaEnabled: true } });
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const db = this.prisma.user as any;
    const user: UserWithMfa = await db.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled || !user.mfaSecret) throw new UnauthorizedException('MFA not enabled');
    const valid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    await db.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
  }

  signPartialToken(userId: string): string {
    const payload: JwtPayload = { sub: userId, email: '', jti: randomUUID(), mfaPending: true };
    return this.jwtService.sign(payload, { expiresIn: 300 });
  }

  async completeMfa(mfaToken: string, code: string): Promise<User> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(mfaToken);
    } catch {
      throw new UnauthorizedException('MFA token invalid or expired');
    }
    if (!payload.mfaPending) throw new UnauthorizedException('Not an MFA token');

    const db = this.prisma.user as any;
    const user: UserWithMfa | null = await db.findUnique({ where: { id: payload.sub } });
    if (!user || !user.mfaSecret) throw new UnauthorizedException('User not found');
    const valid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    return user;
  }

  async logout(payload: JwtPayload): Promise<void> {
    if (!payload?.jti || !payload?.exp) return;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await this.redis.client.setex(`bl:${payload.jti}`, ttl, '1');
  }

  githubAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.get('GITHUB_CLIENT_ID', ''),
      redirect_uri: `${this.config.get('API_BASE_URL', 'http://localhost:3001')}/auth/github/callback`,
      scope: 'user:email',
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async handleGithubCallback(code: string): Promise<User> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.get('GITHUB_CLIENT_ID'),
        client_secret: this.config.get('GITHUB_CLIENT_SECRET'),
        code,
      }),
    });
    const { access_token } = (await tokenRes.json()) as any;
    if (!access_token) throw new UnauthorizedException('GitHub OAuth failed');

    const headers = { Authorization: `Bearer ${access_token}`, 'User-Agent': 'railcross-watch' };
    const profile = (await (await fetch('https://api.github.com/user', { headers })).json()) as any;

    let email: string = profile.email;
    if (!email) {
      const emails = (await (await fetch('https://api.github.com/user/emails', { headers })).json()) as any[];
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
    }

    return this.findOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: String(profile.id),
      email,
      name: profile.name || profile.login,
      avatarUrl: profile.avatar_url,
      accessToken: access_token,
    });
  }

  googleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', ''),
      redirect_uri: `${this.config.get('API_BASE_URL', 'http://localhost:3001')}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleGoogleCallback(code: string): Promise<User> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.get('GOOGLE_CLIENT_ID', ''),
        client_secret: this.config.get('GOOGLE_CLIENT_SECRET', ''),
        redirect_uri: `${this.config.get('API_BASE_URL', 'http://localhost:3001')}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const { access_token, refresh_token } = (await tokenRes.json()) as any;
    if (!access_token) throw new UnauthorizedException('Google OAuth failed');

    const profile = (await (
      await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
    ).json()) as any;

    return this.findOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      accessToken: access_token,
      refreshToken: refresh_token,
    });
  }

  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });
    if (account) return account.user;

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
      });
    }

    await this.prisma.account.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      },
    });

    return user;
  }
}