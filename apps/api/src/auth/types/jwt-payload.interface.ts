export interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
  mfaPending?: boolean;
  iat?: number;
  exp?: number;
}
