import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() { return this.prisma as any; }

  async log(
    action: string,
    message: string,
    actorId: string | null,
    targetId?: string,
    targetType?: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    try {
      await this.db.activityLog.create({
        data: {
          action,
          message,
          actorId: actorId ?? null,
          targetId: targetId ?? null,
          targetType: targetType ?? null,
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
    } catch {
    }
  }

  async findAll(limit: number, search?: string) {
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const where = search
      ? {
          OR: [
            { message: { contains: search, mode: 'insensitive' } },
            { action: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    return this.db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        action: true,
        message: true,
        actorId: true,
        targetId: true,
        targetType: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
