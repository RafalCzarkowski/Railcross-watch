import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() { return this.prisma as any; }

  async findByVideo(videoId: string) {
    return this.db.videoComment.findMany({
      where: { videoId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async create(videoId: string, body: string, authorId: string) {
    const video = await this.db.crossingVideo.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!video) throw new NotFoundException('Video not found');

    const comment = await this.db.videoComment.create({
      data: { videoId, body, authorId },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    try {
      await this.db.activityLog.create({
        data: { action: 'VIDEO_COMMENT_ADDED', message: `Dodano komentarz do nagrania`, actorId: authorId, targetId: videoId, targetType: 'VIDEO' },
      });
    } catch { /* non-critical */ }

    return comment;
  }

  async remove(commentId: string, callerId: string, callerRole: string) {
    const comment = await this.db.videoComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const isOperator = callerRole === 'ADMIN' || callerRole === 'SUPERADMIN';
    if (!isOperator && comment.authorId !== callerId) {
      throw new ForbiddenException('Cannot delete someone else\'s comment');
    }

    await this.db.videoComment.delete({ where: { id: commentId } });

    try {
      await this.db.activityLog.create({
        data: { action: 'VIDEO_COMMENT_DELETED', message: `Usunięto komentarz`, actorId: callerId, targetId: comment.videoId, targetType: 'VIDEO' },
      });
    } catch { /* non-critical */ }
  }
}
