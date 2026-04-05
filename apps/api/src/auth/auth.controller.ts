import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LogsService } from '../logs/logs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './types/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly logs: LogsService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register with email + password' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      approvalStatus: (user as any).approvalStatus ?? 'PENDING',
      role: (user as any).role ?? 'USER',
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiResponse({ status: 200, description: 'Logged in — sets httpOnly cookie' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.verifyCaptcha(dto.captchaToken, req.ip);

    const ip = req.ip as string | undefined;
    const ua = req.headers?.['user-agent'] as string | undefined;

    let user: User;
    try {
      user = await this.authService.validateLocalUser(dto.email, dto.password);
    } catch (err) {
      await this.logs.log('LOGIN_FAILED', `Nieudana próba logowania: ${dto.email}`, null, undefined, undefined, { ipAddress: ip, userAgent: ua });
      throw err;
    }

    if ((user as any).mfaEnabled) {
      const partialToken = this.authService.signPartialToken(user.id);
      reply.setCookie('mfa_token', partialToken, { ...this.authService.getCookieOptions(), maxAge: 300 });
      await this.logs.log('LOGIN_MFA_PENDING', `Logowanie (krok 1/2) — wymagany kod OTP: ${user.email}`, user.id, user.id, 'USER', { ipAddress: ip, userAgent: ua });
      return { mfaRequired: true };
    }

    const token = this.authService.signToken(user);
    reply.setCookie('access_token', token, this.authService.getCookieOptions());
    await this.logs.log('USER_LOGIN', `Zalogowano: ${user.email}`, user.id, user.id, 'USER', { ipAddress: ip, userAgent: ua });
    return { id: user.id, email: user.email, name: user.name };
  }

  @Get('github')
  @Public()
  @ApiOperation({ summary: 'Redirect to GitHub OAuth' })
  async githubLogin(@Res() reply: FastifyReply) {
    return reply.status(302).header('Location', this.authService.githubAuthUrl()).send();
  }

  @Get('github/callback')
  @Public()
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(
    @Query('code') code: string,
    @Res() reply: FastifyReply,
  ) {
    const user = await this.authService.handleGithubCallback(code);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    if (!this.authService.isApproved(user)) {
      return reply.status(302).header('Location', `${frontendUrl}/login?approval=pending`).send();
    }
    if ((user as any).mfaEnabled) {
      const partialToken = this.authService.signPartialToken(user.id);
      await this.logs.log('LOGIN_MFA_PENDING', `Logowanie GitHub (krok 1/2) — wymagany kod OTP: ${user.email}`, user.id, user.id, 'USER');
      return reply
        .setCookie('mfa_token', partialToken, { ...this.authService.getCookieOptions(), maxAge: 300 })
        .status(302).header('Location', `${frontendUrl}/auth/mfa`).send();
    }
    reply.setCookie('access_token', this.authService.signToken(user), this.authService.getCookieOptions());
    return reply.status(302).header('Location', `${frontendUrl}/auth/success`).send();
  }

  @Get('google')
  @Public()
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  async googleLogin(@Res() reply: FastifyReply) {
    return reply.status(302).header('Location', this.authService.googleAuthUrl()).send();
  }

  @Get('google/callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Query('code') code: string,
    @Res() reply: FastifyReply,
  ) {
    const user = await this.authService.handleGoogleCallback(code);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    if (!this.authService.isApproved(user)) {
      return reply.status(302).header('Location', `${frontendUrl}/login?approval=pending`).send();
    }
    if ((user as any).mfaEnabled) {
      const partialToken = this.authService.signPartialToken(user.id);
      await this.logs.log('LOGIN_MFA_PENDING', `Logowanie Google (krok 1/2) — wymagany kod OTP: ${user.email}`, user.id, user.id, 'USER');
      return reply
        .setCookie('mfa_token', partialToken, { ...this.authService.getCookieOptions(), maxAge: 300 })
        .status(302).header('Location', `${frontendUrl}/auth/mfa`).send();
    }
    reply.setCookie('access_token', this.authService.signToken(user), this.authService.getCookieOptions());
    return reply.status(302).header('Location', `${frontendUrl}/auth/success`).send();
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — blacklists token in Redis' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @CurrentUser() user: User,
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = req.cookies?.access_token;
    if (token) {
      const payload = this.jwtService.decode(token) as JwtPayload;
      await this.authService.logout(payload);
    }
    const ip = req.ip as string | undefined;
    const ua = req.headers?.['user-agent'] as string | undefined;
    await this.logs.log('USER_LOGOUT', `Wylogowano: ${user.email}`, user.id, user.id, 'USER', { ipAddress: ip, userAgent: ua });
    reply.clearCookie('access_token', { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User, @Req() req: any) {
    let sessionExpiresAt: number | null = null;
    try {
      const token = req.cookies?.access_token;
      if (token) {
        const payload = this.jwtService.decode(token) as JwtPayload | null;
        sessionExpiresAt = payload?.exp ?? null;
      }
    } catch { /* ignore */ }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: (user as any).role ?? 'USER',
      approvalStatus: (user as any).approvalStatus ?? 'PENDING',
      approvedAt: (user as any).approvedAt ?? null,
      mfaEnabled: (user as any).mfaEnabled ?? false,
      isFirstLogin: (user as any).isFirstLogin ?? false,
      sessionExpiresAt,
    };
  }

  @Get('admin/pending-users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List users waiting for admin approval' })
  async pendingUsers(@CurrentUser() user: User) {
    return this.authService.listPendingUsers(user.id);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List approved users and roles' })
  async approvedUsers(@CurrentUser() user: User) {
    return this.authService.listApprovedUsers(user.id);
  }

  @Post('admin/users/:userId/approve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve user account' })
  async approveUser(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.authService.approveUser(user.id, userId);
  }

  @Post('admin/users/:userId/block')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block user account' })
  async blockUser(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.authService.blockUser(user.id, userId);
  }

  @Post('admin/users/:userId/unblock')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock user account' })
  async unblockUser(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.authService.unblockUser(user.id, userId);
  }

  @Post('superadmin/users/:userId/grant-admin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant admin role to approved user' })
  async grantAdmin(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.authService.grantAdminRole(user.id, userId);
  }

  @Post('superadmin/users/:userId/revoke-admin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke admin role — demote back to user' })
  async revokeAdmin(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.authService.revokeAdminRole(user.id, userId);
  }

  @Post('mfa/complete')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete MFA login — verify TOTP code' })
  async mfaComplete(
    @Body() dto: MfaVerifyDto,
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const mfaToken = req.cookies?.mfa_token;
    if (!mfaToken) throw new Error('MFA token missing');

    const ip = req.ip as string | undefined;
    const ua = req.headers?.['user-agent'] as string | undefined;

    let user: User;
    try {
      user = await this.authService.completeMfa(mfaToken, dto.code);
    } catch (err) {
      try {
        const partial = this.jwtService.decode(mfaToken) as JwtPayload | null;
        if (partial?.sub) {
          await this.logs.log('MFA_CODE_FAILED', `Nieprawidłowy kod OTP — nieudane logowanie dwuetapowe`, partial.sub, partial.sub, 'USER', { ipAddress: ip, userAgent: ua });
        }
      } catch { /* ignore decode errors */ }
      throw err;
    }

    reply.clearCookie('mfa_token', { path: '/' });
    reply.setCookie('access_token', this.authService.signToken(user), this.authService.getCookieOptions());
    await this.logs.log('MFA_LOGIN_SUCCESS', `Logowanie przez OTP zakończone sukcesem: ${user.email}`, user.id, user.id, 'USER', { ipAddress: ip, userAgent: ua });
    return { id: user.id, email: user.email, name: user.name };
  }

  @Get('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate MFA secret and QR code' })
  async mfaSetup(@CurrentUser() user: User) {
    return this.authService.generateMfaSecret(user);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable MFA after verifying first TOTP code' })
  async mfaEnable(@CurrentUser() user: User, @Body() dto: MfaVerifyDto) {
    await this.authService.enableMfa(user.id, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable MFA' })
  async mfaDisable(@CurrentUser() user: User, @Body() dto: MfaVerifyDto) {
    await this.authService.disableMfa(user.id, dto.code);
  }

  @Post('onboarding/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark onboarding as completed for current user' })
  async completeOnboarding(@CurrentUser() user: User) {
    await this.authService.completeOnboarding(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update own profile (name, avatarUrl)' })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.authService.updateProfile(user.id, dto);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: (updated as any).role,
    };
  }
}