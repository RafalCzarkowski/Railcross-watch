import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('GITHUB_CLIENT_ID', 'placeholder'),
      clientSecret: config.get('GITHUB_CLIENT_SECRET', 'placeholder'),
      callbackURL: `${config.get('API_BASE_URL', 'http://localhost:3001')}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: unknown, user: unknown) => void,
  ) {
    const email =
      profile.emails?.find((e: any) => e.primary && e.verified)?.value ??
      profile.emails?.[0]?.value;

    const user = await this.authService.findOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: String(profile.id),
      email,
      name: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
