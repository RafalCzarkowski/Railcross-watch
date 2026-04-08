import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalGuard implements CanActivate {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('API_INTERNAL_SECRET', '');
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const header = req.headers['x-internal-secret'];
    if (!this.secret || header !== this.secret) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
