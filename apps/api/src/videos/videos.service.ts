import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import * as ffmpeg from 'fluent-ffmpeg';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CreateLinkDto } from './dto/create-link.dto';

const ALLOWED_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

type CallerRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

function isOperator(role: CallerRole) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

function youtubeEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    else if (url.hostname.includes('youtube.com')) id = url.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

const VIDEO_INCLUDE = { uploadedBy: { select: { id: true, name: true, email: true } } };

@Injectable()
export class VideosService {
  private readonly uploadsDir: string;
  private readonly thumbnailsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
  ) {
    this.uploadsDir = this.config.get('UPLOADS_DIR', join(process.cwd(), 'uploads', 'videos'));
    this.thumbnailsDir = join(this.uploadsDir, '..', 'thumbnails');
    if (!existsSync(this.uploadsDir)) mkdirSync(this.uploadsDir, { recursive: true });
    if (!existsSync(this.thumbnailsDir)) mkdirSync(this.thumbnailsDir, { recursive: true });
  }

  private get db() { return this.prisma as any; }

  private generateThumbnail(videoPath: string, videoId: string): void {
    const outPath = join(this.thumbnailsDir, `${videoId}.jpg`);
    ffmpeg(videoPath)
      .screenshots({ timestamps: ['00:00:01'], filename: `${videoId}.jpg`, folder: this.thumbnailsDir, size: '320x?' })
      .on('end', () => {
        this.db.crossingVideo.update({ where: { id: videoId }, data: { thumbnailPath: outPath } }).catch(() => {});
      })
      .on('error', () => { /* ffmpeg not available or video too short — skip silently */ });
  }

  private async notifyAdmins(message: string, videoId: string): Promise<void> {
    try {
      const admins = await this.db.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { id: true },
      });
      const adminIds = admins.map((a: { id: string }) => a.id);
      if (adminIds.length > 0) {
        this.notifications.notifyMany(adminIds, 'VIDEO_PENDING_ADMIN', message, videoId);
      }
    } catch { /* non-critical */ }
  }

  private async log(action: string, message: string, actorId: string | null, targetId?: string) {
    try {
      await this.db.activityLog.create({
        data: { action, message, actorId, targetId, targetType: targetId ? 'VIDEO' : null },
      });
    } catch { /* */ }
  }

  private async assertAccess(videoId: string, callerId: string, callerRole: CallerRole) {
    const video = await this.db.crossingVideo.findUnique({ where: { id: videoId }, include: VIDEO_INCLUDE });
    if (!video) throw new NotFoundException('Video not found');
    if (!isOperator(callerRole) && video.uploadedById !== callerId) {
      throw new ForbiddenException('Access denied');
    }
    return video;
  }

  async upload(
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream; tags?: string[]; location?: string },
    uploadedById: string,
    callerRole: CallerRole,
  ) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new ForbiddenException(`Unsupported file type: ${file.mimetype}`);
    }

    const ext = extname(file.filename) || '.mp4';
    const storedName = `${randomUUID()}${ext}`;
    const filePath = join(this.uploadsDir, storedName);

    let bytesWritten = 0;
    const ws = createWriteStream(filePath);
    const readable = file.file as any;
    readable.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_BYTES) readable.destroy(new Error('File too large'));
    });
    try {
      await pipeline(readable, ws);
    } catch (err: any) {
      try { await unlink(filePath); } catch { /* already gone */ }
      if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        throw new BadRequestException('Przesyłanie zostało przerwane — połączenie zamknięte przez klienta');
      }
      throw err;
    }

    const approvalStatus = isOperator(callerRole) ? 'APPROVED' : 'PENDING';

    const video = await this.db.crossingVideo.create({
      data: {
        sourceType: 'FILE',
        filename: storedName,
        originalName: file.filename,
        mimetype: file.mimetype,
        size: bytesWritten,
        path: filePath,
        uploadedById,
        approvalStatus,
        tags: file.tags ?? [],
        location: file.location ?? null,
      },
      include: VIDEO_INCLUDE,
    });

    this.generateThumbnail(filePath, video.id);

    await this.log(
      'WIDEO_WGRANO',
      `Wgrano nagranie "${file.filename}" (${approvalStatus === 'APPROVED' ? 'auto-zatwierdzone' : 'oczekuje na zatwierdzenie'})`,
      uploadedById,
      video.id,
    );

    if (approvalStatus === 'PENDING') {
      this.notifyAdmins(`Nowe nagranie "${file.filename}" oczekuje na zatwierdzenie`, video.id);
    }

    return video;
  }

  async createLink(dto: CreateLinkDto, uploadedById: string, callerRole: CallerRole) {
    const sourceUrl = dto.sourceType === 'YOUTUBE'
      ? (youtubeEmbedUrl(dto.url) ?? dto.url)
      : dto.url;

    const approvalStatus = isOperator(callerRole) ? 'APPROVED' : 'PENDING';

    const video = await this.db.crossingVideo.create({
      data: {
        sourceType: dto.sourceType,
        sourceUrl,
        originalName: dto.title ?? dto.url,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        tags: dto.tags ?? [],
        uploadedById,
        approvalStatus,
      },
      include: VIDEO_INCLUDE,
    });

    const typeLabel = dto.sourceType === 'YOUTUBE' ? 'YouTube' : 'Stream';
    await this.log(
      'WIDEO_LINK_DODANO',
      `Dodano link ${typeLabel}: "${dto.title ?? dto.url}" (${approvalStatus === 'APPROVED' ? 'auto-zatwierdzone' : 'oczekuje na zatwierdzenie'})`,
      uploadedById,
      video.id,
    );

    if (approvalStatus === 'PENDING') {
      this.notifyAdmins(`Nowy link ${typeLabel} "${dto.title ?? dto.url}" oczekuje na zatwierdzenie`, video.id);
    }

    return video;
  }

  async findAll(
    callerId: string,
    callerRole: CallerRole,
    filters?: {
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      analysisStatus?: string;
      approvalStatus?: string;
      sourceType?: string;
    },
  ) {
    const textFilter = filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { originalName: { contains: filters.search, mode: 'insensitive' } },
            { location: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const dateFilter: Record<string, Date> = {};
    if (filters?.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) {
      const d = new Date(filters.dateTo);
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }

    const extraFilters = {
      ...(textFilter ?? {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      ...(filters?.analysisStatus ? { analysisStatus: filters.analysisStatus } : {}),
      ...(filters?.approvalStatus ? { approvalStatus: filters.approvalStatus } : {}),
      ...(filters?.sourceType ? { sourceType: filters.sourceType } : {}),
    };

    if (isOperator(callerRole)) {
      return this.db.crossingVideo.findMany({
        where: Object.keys(extraFilters).length > 0 ? extraFilters : undefined,
        orderBy: { createdAt: 'desc' },
        include: VIDEO_INCLUDE,
      });
    }

    const roleWhere = {
      OR: [
        { approvalStatus: 'APPROVED' },
        { uploadedById: callerId },
      ],
    };

    return this.db.crossingVideo.findMany({
      where: Object.keys(extraFilters).length > 0
        ? { AND: [roleWhere, extraFilters] }
        : roleWhere,
      orderBy: { createdAt: 'desc' },
      include: VIDEO_INCLUDE,
    });
  }

  async findOne(id: string, callerId: string, callerRole: CallerRole) {
    return this.assertAccess(id, callerId, callerRole);
  }

  async enqueueAnalysis(id: string, callerId: string, callerRole: CallerRole) {
    const video = await this.assertAccess(id, callerId, callerRole);
    if (video.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException('Nagranie musi być zatwierdzone przed analizą');
    }
    if (video.analysisStatus === 'PROCESSING') {
      throw new ForbiddenException('Analiza już trwa');
    }

    const updated = await this.db.crossingVideo.update({
      where: { id },
      data: { analysisStatus: 'PROCESSING' },
      include: VIDEO_INCLUDE,
    });

    const job = JSON.stringify({
      videoId: id,
      filePath: (video as any).path ?? null,
      sourceType: video.sourceType,
      sourceUrl: (video as any).sourceUrl ?? null,
    });
    await this.redis.client.lpush('railcross:queue', job);

    const label = video.title ?? video.originalName ?? id;
    await this.log('WIDEO_ANALIZA_KOLEJKA', `Zlecono analizę AI dla nagrania "${label}"`, callerId, id);

    return updated;
  }

  async saveAnalysisResult(
    id: string,
    result: { status: 'DONE' | 'ERROR'; detectionsJson?: string; annotatedPath?: string; errorMessage?: string },
  ) {
    const video = await this.db.crossingVideo.findUnique({ where: { id }, select: { uploadedById: true, title: true, originalName: true } });
    const updated = await this.db.crossingVideo.update({
      where: { id },
      data: {
        analysisStatus: result.status,
        detectionsJson: result.detectionsJson ?? null,
        annotatedPath: result.annotatedPath ?? null,
        analysisError: result.errorMessage ?? null,
      },
      include: VIDEO_INCLUDE,
    });
    if (video && result.status === 'DONE') {
      const label = video.title ?? video.originalName ?? id;
      this.notifications.notify(video.uploadedById, 'ANALYSIS_DONE', `Analiza AI zakończona dla nagrania "${label}"`, id);
    }
    return updated;
  }

  async approve(id: string, callerId: string) {
    const video = await this.db.crossingVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');

    const updated = await this.db.crossingVideo.update({
      where: { id },
      data: { approvalStatus: 'APPROVED' },
      include: VIDEO_INCLUDE,
    });

    const label = video.title ?? video.originalName ?? id;
    await this.log('WIDEO_ZATWIERDZONE', `Zatwierdzono nagranie "${label}"`, callerId, id);
    this.notifications.notify(video.uploadedById, 'VIDEO_APPROVED', `Twoje nagranie "${label}" zostało zatwierdzone`, id);

    return updated;
  }

  async reject(id: string, callerId: string) {
    const video = await this.db.crossingVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');

    const updated = await this.db.crossingVideo.update({
      where: { id },
      data: { approvalStatus: 'REJECTED' },
      include: VIDEO_INCLUDE,
    });

    const label = video.title ?? video.originalName ?? id;
    await this.log('WIDEO_ODRZUCONE', `Odrzucono nagranie "${label}"`, callerId, id);
    this.notifications.notify(video.uploadedById, 'VIDEO_REJECTED', `Twoje nagranie "${label}" zostało odrzucone`, id);

    return updated;
  }

  async update(id: string, dto: UpdateVideoDto, callerId: string, callerRole: CallerRole) {
    await this.assertAccess(id, callerId, callerRole);

    const updated = await this.db.crossingVideo.update({
      where: { id },
      data: dto,
      include: VIDEO_INCLUDE,
    });

    await this.log('WIDEO_EDYTOWANO', `Zaktualizowano metadane nagrania "${updated.title ?? updated.originalName ?? id}"`, callerId, id);

    return updated;
  }

  async remove(id: string, callerId: string, callerRole: CallerRole) {
    const video = await this.assertAccess(id, callerId, callerRole);

    const label = video.title ?? video.originalName ?? id;
    if (video.path) {
      try { await unlink(video.path); } catch { /* already gone */ }
    }
    await this.db.crossingVideo.delete({ where: { id } });

    await this.log('WIDEO_USUNIETO', `Usunięto nagranie "${label}"`, callerId, id);
  }

  async getFilePath(id: string, callerId: string, callerRole: CallerRole): Promise<{ path: string; mimetype: string }> {
    const video = await this.assertAccess(id, callerId, callerRole);
    if (video.sourceType !== 'FILE' || !video.path) {
      throw new ForbiddenException('Not a file-based video');
    }
    return { path: video.path, mimetype: (video as any).mimetype ?? 'video/mp4' };
  }

  async getThumbnailPath(id: string, callerId: string, callerRole: CallerRole): Promise<string | null> {
    const video = await this.assertAccess(id, callerId, callerRole);
    return video.thumbnailPath ?? null;
  }

  async getQueue() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [processing, pendingCount, recentlyDone] = await Promise.all([
      this.db.crossingVideo.findMany({
        where: { analysisStatus: 'PROCESSING' },
        include: VIDEO_INCLUDE,
        orderBy: { updatedAt: 'asc' },
      }),
      this.db.crossingVideo.count({
        where: { analysisStatus: 'PENDING', approvalStatus: 'APPROVED' },
      }),
      this.db.crossingVideo.findMany({
        where: {
          analysisStatus: { in: ['DONE', 'ERROR'] },
          updatedAt: { gte: oneHourAgo },
        },
        include: VIDEO_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);
    return { processing, pendingCount, recentlyDone };
  }

  async bulkOperation(action: 'approve' | 'reject' | 'delete', ids: string[], callerId: string) {
    const safeIds = ids.slice(0, 50);
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of safeIds) {
      try {
        if (action === 'approve') await this.approve(id, callerId);
        else if (action === 'reject') await this.reject(id, callerId);
        else await this.db.crossingVideo.delete({ where: { id } });
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }

    if (action === 'delete' && succeeded.length > 0) {
      await this.log('WIDEO_USUNIETO', `Usunięto masowo ${succeeded.length} nagrań`, callerId);
    }

    return { succeeded, failed };
  }

  async getUniqueTags(callerId: string, callerRole: CallerRole): Promise<string[]> {
    const where = isOperator(callerRole)
      ? {}
      : { OR: [{ approvalStatus: 'APPROVED' }, { uploadedById: callerId }] };
    const videos = await this.db.crossingVideo.findMany({ where, select: { tags: true } });
    const allTags = (videos as { tags: string[] }[]).flatMap(v => v.tags);
    return [...new Set(allTags)].sort();
  }
}
