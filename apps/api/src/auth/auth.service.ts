import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as qrcode from 'qrcode';
import * as speakeasy from 'speakeasy';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LogsService } from '../logs/logs.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { OAuthProfile } from './types/oauth-profile.interface';

type UserWithMfa = User & { mfaEnabled: boolean; mfaSecret: string | null };
type UserAccess = User & {
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  approvalStatus: 'PENDING' | 'APPROVED';
  approvedAt: Date | null;
  blockedAt: Date | null;
};

const PENDING_APPROVAL_MESSAGE = 'Konto oczekuje na akceptację administratora';
const BLOCKED_ACCOUNT_MESSAGE = 'Konto zostało zablokowane przez administratora';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly logs: LogsService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const db = this.prisma.user as any;
    const user = await db.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: 'USER',
        approvalStatus: 'PENDING',
        approvedAt: null,
      },
    });
    await this.logs.log('REJESTRACJA', `Nowe konto: ${user.email} — oczekuje na zatwierdzenie`, user.id, user.id, 'USER');
    return user;
  }

  async validateLocalUser(email: string, password: string): Promise<User> {
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    this.assertNotBlocked(user);
    this.assertApproved(user);
    return user;
  }

  isApproved(user: UserAccess | User): boolean {
    return (user as UserAccess).approvalStatus === 'APPROVED';
  }

  isBlocked(user: UserAccess | User): boolean {
    return Boolean((user as UserAccess).blockedAt);
  }

  signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, jti: randomUUID() };
    return this.jwtService.sign(payload);
  }

  async verifyCaptcha(token: string, remoteIp?: string): Promise<void> {
    if (!token) {
      throw new BadRequestException('Captcha verification is required');
    }

    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) {
      throw new BadRequestException('Captcha is not configured on the server');
    }

    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) throw new UnauthorizedException('Captcha verification failed');
    const data = (await response.json()) as { success?: boolean };
    if (!data.success) throw new UnauthorizedException('Captcha verification failed');
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
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
    await this.logs.log('MFA_KONFIGURACJA', `Rozpoczęto konfigurację MFA dla: ${user.email}`, user.id, user.id, 'USER');
    return { secret, qrCodeDataUrl };
  }

  async enableMfa(userId: string, code: string): Promise<void> {
    const db = this.prisma.user as any;
    const user: UserWithMfa = await db.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new UnauthorizedException('MFA setup not started');
    const valid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    await db.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await this.logs.log('MFA_WLACZONE', `Włączono weryfikację dwuetapową (MFA) dla: ${user.email}`, userId, userId, 'USER');
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const db = this.prisma.user as any;
    const user: UserWithMfa = await db.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled || !user.mfaSecret) throw new UnauthorizedException('MFA not enabled');
    const valid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    await db.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
    await this.logs.log('MFA_WYLACZONE', `Wyłączono weryfikację dwuetapową (MFA) dla: ${user.email}`, userId, userId, 'USER');
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
    const userDb = this.prisma.user as any;
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (account) {
      await this.logs.log(
        'LOGOWANIE_OAUTH',
        `Logowanie OAuth (${profile.provider}): ${account.user.email}`,
        account.user.id,
        account.user.id,
        'USER',
      );
      return account.user;
    }

    let user: UserAccess | null = await userDb.findUnique({ where: { email: profile.email } });
    const isNewUser = !user;

    if (!user) {
      user = await userDb.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          role: 'USER',
          approvalStatus: 'PENDING',
          approvedAt: null,
        },
      });
    }

    if (!user) throw new UnauthorizedException('User provisioning failed');

    await this.prisma.account.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      },
    });

    if (isNewUser) {
      await this.logs.log(
        'REJESTRACJA_OAUTH',
        `Rejestracja przez OAuth (${profile.provider}): ${user.email} — oczekuje na zatwierdzenie`,
        user.id,
        user.id,
        'USER',
      );
    } else {
      await this.logs.log(
        'LOGOWANIE_OAUTH',
        `Powiązano konto OAuth (${profile.provider}): ${user.email}`,
        user.id,
        user.id,
        'USER',
      );
    }

    return user;
  }

  async listPendingUsers(adminUserId: string) {
    await this.requireApprovedOperator(adminUserId);
    const db = this.prisma.user as any;
    return db.findMany({
      where: { approvalStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async approveUser(adminUserId: string, userId: string) {
    const admin = await this.requireApprovedOperator(adminUserId);
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.approvalStatus === 'APPROVED') return user;

    const updated = await db.update({
      where: { id: userId },
      data: { role: 'USER', approvalStatus: 'APPROVED', approvedAt: new Date(), blockedAt: null },
      select: { id: true, email: true, name: true, role: true, approvalStatus: true, approvedAt: true },
    });

    await this.logs.log(
      'KONTO_ZATWIERDZONE',
      `Administrator ${admin.email} zatwierdził konto: ${user.email}`,
      adminUserId,
      userId,
      'USER',
    );
    return updated;
  }

  async listApprovedUsers(requestUserId: string) {
    const currentUser = await this.requireApprovedOperator(requestUserId);
    const db = this.prisma.user as any;
    const where =
      String(currentUser.role) === 'SUPERADMIN'
        ? { approvalStatus: 'APPROVED' }
        : { approvalStatus: 'APPROVED', role: { not: 'SUPERADMIN' } };
    return db.findMany({
      where,
      orderBy: [{ role: 'desc' }, { email: 'asc' }],
      select: { id: true, email: true, name: true, role: true, approvedAt: true, blockedAt: true },
    });
  }

  async grantAdminRole(requestUserId: string, userId: string) {
    const admin = await this.requireSuperAdmin(requestUserId);
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (String(user.role) === 'SUPERADMIN') throw new ForbiddenException('Cannot change superadmin role');
    if (user.approvalStatus !== 'APPROVED') throw new ForbiddenException('Approve the account before granting admin');
    if (user.blockedAt) throw new ForbiddenException('Unblock the account before granting admin');

    const updated = await db.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true, approvalStatus: true, approvedAt: true },
    });

    await this.logs.log(
      'KONTO_ADMIN_NADANO',
      `Superadmin ${admin.email} nadał rolę administratora: ${user.email}`,
      requestUserId,
      userId,
      'USER',
    );
    return updated;
  }

  async revokeAdminRole(requestUserId: string, userId: string) {
    const admin = await this.requireSuperAdmin(requestUserId);
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (String(user.role) === 'SUPERADMIN') throw new ForbiddenException('Cannot demote superadmin');
    if (String(user.role) === 'USER') return db.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, approvalStatus: true, approvedAt: true },
    });

    const updated = await db.update({
      where: { id: userId },
      data: { role: 'USER' },
      select: { id: true, email: true, name: true, role: true, approvalStatus: true, approvedAt: true },
    });

    const isSelf = requestUserId === userId;
    await this.logs.log(
      'KONTO_ADMIN_COFNIETO',
      isSelf
        ? `Superadmin ${admin.email} cofnął sobie rolę administratora`
        : `Superadmin ${admin.email} cofnął rolę administratora: ${user.email}`,
      requestUserId,
      userId,
      'USER',
    );
    return updated;
  }

  async blockUser(requestUserId: string, userId: string) {
    const currentUser = await this.requireApprovedOperator(requestUserId);
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageTarget(currentUser, user);

    const updated = await db.update({
      where: { id: userId },
      data: { blockedAt: new Date() },
      select: { id: true, email: true, name: true, role: true, approvalStatus: true, approvedAt: true, blockedAt: true },
    });

    await this.logs.log(
      'KONTO_ZABLOKOWANE',
      `Administrator ${currentUser.email} zablokował konto: ${user.email}`,
      requestUserId,
      userId,
      'USER',
    );
    return updated;
  }

  async unblockUser(requestUserId: string, userId: string) {
    const currentUser = await this.requireApprovedOperator(requestUserId);
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageTarget(currentUser, user);

    const updated = await db.update({
      where: { id: userId },
      data: { blockedAt: null },
      select: { id: true, email: true, name: true, role: true, approvalStatus: true, approvedAt: true, blockedAt: true },
    });

    await this.logs.log(
      'KONTO_ODBLOKOWANE',
      `Administrator ${currentUser.email} odblokował konto: ${user.email}`,
      requestUserId,
      userId,
      'USER',
    );
    return updated;
  }

  async ensureSuperAdmin(): Promise<void> {
    const email = this.config.get<string>('SUPERADMIN_EMAIL');
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');
    const name = this.config.get<string>('SUPERADMIN_NAME', 'Super Admin');
    if (!email || !password) return;

    const db = this.prisma.user as any;
    const passwordHash = await bcrypt.hash(password, 12);
    const existing: UserAccess | null = await db.findUnique({ where: { email } });

    if (!existing) {
      await db.create({
        data: { email, name, passwordHash, role: 'SUPERADMIN', approvalStatus: 'APPROVED', approvedAt: new Date() },
      });
      return;
    }

    await db.update({
      where: { id: existing.id },
      data: { name, passwordHash, role: 'SUPERADMIN' as any, approvalStatus: 'APPROVED', approvedAt: existing.approvedAt ?? new Date() },
    });
  }

  private assertApproved(user: UserAccess) {
    if (user.approvalStatus !== 'APPROVED') throw new UnauthorizedException(PENDING_APPROVAL_MESSAGE);
  }

  private assertNotBlocked(user: UserAccess) {
    if (user.blockedAt) throw new UnauthorizedException(BLOCKED_ACCOUNT_MESSAGE);
  }

  private async requireApprovedOperator(userId: string): Promise<UserAccess> {
    const db = this.prisma.user as any;
    const user: UserAccess | null = await db.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    this.assertNotBlocked(user);
    this.assertApproved(user);
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') throw new ForbiddenException('Admin access required');
    return user;
  }

  private async requireSuperAdmin(userId: string): Promise<UserAccess> {
    const user = await this.requireApprovedOperator(userId);
    if (String(user.role) !== 'SUPERADMIN') throw new ForbiddenException('Superadmin access required');
    return user;
  }

  private assertCanManageTarget(currentUser: UserAccess, targetUser: UserAccess) {
    if (currentUser.id === targetUser.id) throw new ForbiddenException('Cannot manage your own account');
    if (String(targetUser.role) === 'SUPERADMIN') throw new ForbiddenException('Cannot manage superadmin account');
    if (String(currentUser.role) === 'ADMIN' && String(targetUser.role) !== 'USER') {
      throw new ForbiddenException('Admin can manage only user accounts');
    }
  }

  async completeOnboarding(userId: string): Promise<void> {
    await (this.prisma.user as any).update({ where: { id: userId }, data: { isFirstLogin: false } });
  }

  async updateProfile(userId: string, dto: { name?: string; avatarUrl?: string }): Promise<User> {
    const data: Record<string, string> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    return (this.prisma.user as any).update({ where: { id: userId }, data });
  }
}
