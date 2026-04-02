export interface OAuthProfile {
  provider: 'github' | 'google';
  providerAccountId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
}
