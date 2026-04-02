import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('API_JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(_req: unknown, payload: JwtPayload) {
    const blacklisted = await this.redis.client.exists(`bl:${payload.jti}`);
    if (blacklisted) throw new UnauthorizedException('Token revoked');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
