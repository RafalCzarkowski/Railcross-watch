import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
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
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register with email + password' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { id: user.id, email: user.email, name: user.name };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiResponse({ status: 200, description: 'Logged in — sets httpOnly cookie' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.authService.validateLocalUser(dto.email, dto.password);
    if ((user as any).mfaEnabled) {
      const partialToken = this.authService.signPartialToken(user.id);
      reply.setCookie('mfa_token', partialToken, { ...this.authService.getCookieOptions(), maxAge: 300 });
      return { mfaRequired: true };
    }
    const token = this.authService.signToken(user);
    reply.setCookie('access_token', token, this.authService.getCookieOptions());
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
    if ((user as any).mfaEnabled) {
      const partialToken = this.authService.signPartialToken(user.id);
      return reply
        .setCookie('mfa_token', partialToken, { ...this.authService.getCookieOptions(), maxAge: 300 })
        .status(302).header('Location', `${frontendUrl}/auth/mfa`).send();
    }
    return reply
      .setCookie('access_token', this.authService.signToken(user), this.authService.getCookieOptions())
      .status(302).header('Location', `${frontendUrl}/auth/success`).send();
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
    if ((user as any).mfaEnabled) {
      const partialToken = this.authService.signPartialToken(user.id);
      return reply
        .setCookie('mfa_token', partialToken, { ...this.authService.getCookieOptions(), maxAge: 300 })
        .status(302).header('Location', `${frontendUrl}/auth/mfa`).send();
    }
    return reply
      .setCookie('access_token', this.authService.signToken(user), this.authService.getCookieOptions())
      .status(302).header('Location', `${frontendUrl}/auth/success`).send();
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — blacklists token in Redis' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = req.cookies?.access_token;
    if (token) {
      const payload = this.jwtService.decode(token) as JwtPayload;
      await this.authService.logout(payload);
    }
    reply.clearCookie('access_token', { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      mfaEnabled: (user as any).mfaEnabled ?? false,
    };
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
    const user = await this.authService.completeMfa(mfaToken, dto.code);
    reply.clearCookie('mfa_token', { path: '/' });
    reply.setCookie('access_token', this.authService.signToken(user), this.authService.getCookieOptions());
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
}