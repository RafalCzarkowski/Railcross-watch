import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID', 'placeholder'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', 'placeholder'),
      callbackURL: `${config.get('API_BASE_URL', 'http://localhost:3001')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: unknown, user: unknown) => void,
  ) {
    const user = await this.authService.findOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
