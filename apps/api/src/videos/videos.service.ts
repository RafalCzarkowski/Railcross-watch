import {
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
import { PrismaService } from '../prisma/prisma.service';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadsDir = this.config.get('UPLOADS_DIR', join(process.cwd(), 'uploads', 'videos'));
    if (!existsSync(this.uploadsDir)) mkdirSync(this.uploadsDir, { recursive: true });
  }

  private get db() { return this.prisma as any; }

  private async log(action: string, message: string, actorId: string | null, targetId?: string) {
    try {
      await this.db.activityLog.create({
        data: { action, message, actorId, targetId, targetType: targetId ? 'VIDEO' : null },
      });
    } catch {
      // log errors must not break the main flow
    }
  }

  private async assertAccess(videoId: string, callerId: string, callerRole: CallerRole) {
    const video = await this.db.crossingVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (!isOperator(callerRole) && video.uploadedById !== callerId) {
      throw new ForbiddenException('Access denied');
    }
    return video;
  }

  async upload(
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream },
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
    await pipeline(readable, ws);

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
      },
      include: VIDEO_INCLUDE,
    });

    await this.log(
      'VIDEO_UPLOAD',
      `Wgrano nagranie "${file.filename}" (${approvalStatus === 'APPROVED' ? 'auto-zatwierdzone' : 'oczekuje na zatwierdzenie'})`,
      uploadedById,
      video.id,
    );

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
        uploadedById,
        approvalStatus,
      },
      include: VIDEO_INCLUDE,
    });

    const typeLabel = dto.sourceType === 'YOUTUBE' ? 'YouTube' : 'Stream';
    await this.log(
      'VIDEO_LINK_ADD',
      `Dodano link ${typeLabel}: "${dto.title ?? dto.url}" (${approvalStatus === 'APPROVED' ? 'auto-zatwierdzone' : 'oczekuje na zatwierdzenie'})`,
      uploadedById,
      video.id,
    );

    return video;
  }

  async findAll(callerId: string, callerRole: CallerRole) {
    if (isOperator(callerRole)) {
      return this.db.crossingVideo.findMany({
        orderBy: { createdAt: 'desc' },
        include: VIDEO_INCLUDE,
      });
    }
    return this.db.crossingVideo.findMany({
      where: {
        OR: [
          { approvalStatus: 'APPROVED' },
          { uploadedById: callerId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: VIDEO_INCLUDE,
    });
  }

  async findOne(id: string, callerId: string, callerRole: CallerRole) {
    return this.assertAccess(id, callerId, callerRole);
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
    await this.log('VIDEO_APPROVE', `Zatwierdzono nagranie "${label}"`, callerId, id);

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
    await this.log('VIDEO_REJECT', `Odrzucono nagranie "${label}"`, callerId, id);

    return updated;
  }

  async update(id: string, dto: UpdateVideoDto, callerId: string, callerRole: CallerRole) {
    await this.assertAccess(id, callerId, callerRole);

    const updated = await this.db.crossingVideo.update({
      where: { id },
      data: dto,
      include: VIDEO_INCLUDE,
    });

    await this.log('VIDEO_UPDATE', `Zaktualizowano metadane nagrania "${updated.title ?? updated.originalName ?? id}"`, callerId, id);

    return updated;
  }

  async remove(id: string, callerId: string, callerRole: CallerRole) {
    const video = await this.assertAccess(id, callerId, callerRole);

    const label = video.title ?? video.originalName ?? id;
    if (video.path) {
      try { await unlink(video.path); } catch { /* already gone */ }
    }
    await this.db.crossingVideo.delete({ where: { id } });

    await this.log('VIDEO_DELETE', `Usunięto nagranie "${label}"`, callerId, id);
  }

  async getFilePath(id: string, callerId: string, callerRole: CallerRole): Promise<string> {
    const video = await this.assertAccess(id, callerId, callerRole);
    if (video.sourceType !== 'FILE' || !video.path) {
      throw new ForbiddenException('Not a file-based video');
    }
    return video.path;
  }
}
