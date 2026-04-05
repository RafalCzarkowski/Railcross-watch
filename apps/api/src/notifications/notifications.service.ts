import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() { return this.prisma as any; }

  async notify(userId: string, type: string, message: string, videoId?: string): Promise<void> {
    try {
      await this.db.notification.create({ data: { userId, type, message, videoId: videoId ?? null } });
    } catch { /* non-critical */ }
  }

  async notifyMany(userIds: string[], type: string, message: string, videoId?: string): Promise<void> {
    try {
      await this.db.notification.createMany({
        data: userIds.map((userId) => ({ userId, type, message, videoId: videoId ?? null })),
      });
    } catch { /* non-critical */ }
  }

  async findForUser(userId: string) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.db.notification.count({ where: { userId, read: false } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  async deleteOne(id: string, userId: string): Promise<void> {
    await this.db.notification.deleteMany({ where: { id, userId } });
  }
}
