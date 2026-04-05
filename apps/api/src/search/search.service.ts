import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() { return this.prisma as any; }

  async search(q: string, isOperator: boolean) {
    const like = { contains: q, mode: 'insensitive' };

    const [videos, users, logs] = await Promise.all([
      this.db.crossingVideo.findMany({
        where: {
          OR: [
            { title: like },
            { originalName: like },
            { location: like },
          ],
          ...(isOperator ? {} : { approvalStatus: 'APPROVED' }),
        },
        select: { id: true, title: true, originalName: true, analysisStatus: true, thumbnailPath: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      isOperator
        ? this.db.user.findMany({
            where: {
              OR: [
                { name: like },
                { email: like },
              ],
            },
            select: { id: true, name: true, email: true, role: true },
            take: 5,
          })
        : Promise.resolve([]),
      isOperator
        ? this.db.activityLog.findMany({
            where: {
              OR: [
                { message: like },
                { action: like },
              ],
            },
            select: { id: true, action: true, message: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
          })
        : Promise.resolve([]),
    ]);

    return { videos, users, logs };
  }
}
