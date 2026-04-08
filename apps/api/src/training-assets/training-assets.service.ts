import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createWriteStream, existsSync, mkdirSync, unlink } from 'fs';
import { extname, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const ALLOWED_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

type CallerRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

function isOperator(role: CallerRole) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

@Injectable()
export class TrainingAssetsService {
  private readonly trainingVideosDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.trainingVideosDir = this.config.get(
      'TRAINING_VIDEOS_DIR',
      resolve(process.cwd(), 'storage', 'training', 'videos'),
    );

    if (!existsSync(this.trainingVideosDir)) {
      mkdirSync(this.trainingVideosDir, { recursive: true });
    }
  }

  private get db() {
    return this.prisma as any;
  }

  private async log(action: string, message: string, actorId: string, targetId?: string) {
    try {
      await this.db.activityLog.create({
        data: { action, message, actorId, targetId, targetType: targetId ? 'TRAINING_ASSET' : null },
      });
    } catch { /* non-critical */ }
  }

  async upload(
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream },
    uploadedById: string,
    callerRole: CallerRole,
    meta?: { title?: string; notes?: string; tags?: string[] },
  ) {
    if (!isOperator(callerRole)) {
      throw new ForbiddenException('Admin only');
    }

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new ForbiddenException(`Unsupported file type: ${file.mimetype}`);
    }

    const ext = extname(file.filename) || '.mp4';
    const storedName = `${randomUUID()}${ext}`;
    const filePath = resolve(this.trainingVideosDir, storedName);

    let bytesWritten = 0;
    const ws = createWriteStream(filePath);
    const readable = file.file as any;
    readable.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_BYTES) readable.destroy(new Error('File too large'));
    });
    await pipeline(readable, ws);

    const asset = await this.db.trainingAsset.create({
      data: {
        filename: storedName,
        originalName: file.filename,
        mimetype: file.mimetype,
        size: bytesWritten,
        path: filePath,
        title: meta?.title ?? null,
        notes: meta?.notes ?? null,
        tags: meta?.tags ?? [],
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.log('TRAINING_ASSET_UPLOAD', `Wgrano materiał treningowy "${file.filename}"`, uploadedById, asset.id);
    return asset;
  }

  async findAll(callerRole: CallerRole) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    return this.db.trainingAsset.findMany({
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async findOne(id: string, callerRole: CallerRole) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    const asset = await this.db.trainingAsset.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    if (!asset) throw new NotFoundException('Training asset not found');
    return asset;
  }

  async update(id: string, callerRole: CallerRole, dto: { title?: string; notes?: string; tags?: string[] }) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    const asset = await this.db.trainingAsset.findUnique({ where: { id }, select: { id: true } });
    if (!asset) throw new NotFoundException('Training asset not found');
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.tags !== undefined) data.tags = dto.tags;
    return this.db.trainingAsset.update({
      where: { id },
      data,
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: string, callerRole: CallerRole, callerId: string) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    const asset = await this.db.trainingAsset.findUnique({ where: { id }, select: { id: true, path: true, originalName: true } });
    if (!asset) throw new NotFoundException('Training asset not found');
    await this.db.trainingAsset.delete({ where: { id } });
    unlink(asset.path, () => {});
    await this.log('TRAINING_ASSET_DELETE', `Usunięto materiał treningowy "${asset.originalName}"`, callerId);
  }

  async enqueueAnalysis(id: string, callerRole: CallerRole, callerId: string) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    const asset = await this.db.trainingAsset.findUnique({ where: { id }, select: { id: true, path: true, analysisStatus: true, originalName: true, title: true } });
    if (!asset) throw new NotFoundException('Training asset not found');
    if (asset.analysisStatus === 'PROCESSING') throw new ForbiddenException('Analiza już trwa');

    await this.db.trainingAsset.update({ where: { id }, data: { analysisStatus: 'PROCESSING', analysisError: null } });

    const job = JSON.stringify({ type: 'ANALYZE_TRAINING', assetId: id, filePath: asset.path });
    await this.redis.client.lpush('railcross:queue', job);

    const label = asset.title ?? asset.originalName;
    await this.log('TRAINING_ASSET_ANALYZE', `Zlecono analizę AI dla materiału treningowego "${label}"`, callerId, id);

    return this.db.trainingAsset.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async enqueueExtraction(id: string, callerRole: CallerRole, callerId: string) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    const asset = await this.db.trainingAsset.findUnique({ where: { id }, select: { id: true, path: true, analysisStatus: true, originalName: true, title: true } });
    if (!asset) throw new NotFoundException('Training asset not found');
    if (asset.analysisStatus === 'PROCESSING') throw new ForbiddenException('Przetwarzanie już trwa');

    await this.db.trainingAsset.update({ where: { id }, data: { analysisStatus: 'PROCESSING', analysisError: null, framesDir: null, framesCount: null } });

    const job = JSON.stringify({ type: 'EXTRACT_FRAMES', assetId: id, filePath: asset.path });
    await this.redis.client.lpush('railcross:queue', job);

    const label = asset.title ?? asset.originalName;
    await this.log('TRAINING_ASSET_EXTRACT', `Zlecono ekstrakcję klatek z materiału treningowego "${label}"`, callerId, id);

    return this.db.trainingAsset.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async startTraining(callerRole: CallerRole, startedById: string, epochs = 50) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');

    const run = await this.db.trainingRun.create({
      data: { status: 'PROCESSING', epochs, startedById },
      include: { startedBy: { select: { id: true, name: true, email: true } } },
    });

    const job = JSON.stringify({ type: 'FINE_TUNE', runId: run.id, epochs });
    await this.redis.client.lpush('railcross:queue', job);

    await this.log('TRAINING_RUN_START', `Uruchomiono fine-tuning modelu YOLOv8 (${epochs} epok, run: ${run.id.slice(0, 8)})`, startedById);

    return run;
  }

  async listTrainingRuns(callerRole: CallerRole) {
    if (!isOperator(callerRole)) throw new ForbiddenException('Admin only');
    return this.db.trainingRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: { startedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async saveAssetAnalysisResult(
    id: string,
    result: { status: 'DONE' | 'ERROR'; detectionsJson?: string; errorMessage?: string },
  ) {
    return this.db.trainingAsset.update({
      where: { id },
      data: {
        analysisStatus: result.status,
        detectionsJson: result.detectionsJson ?? null,
        analysisError: result.errorMessage ?? null,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async saveExtractionResult(
    id: string,
    result: { status: 'DONE' | 'ERROR'; framesDir?: string; framesCount?: number; errorMessage?: string },
  ) {
    return this.db.trainingAsset.update({
      where: { id },
      data: {
        analysisStatus: result.status,
        framesDir: result.framesDir ?? null,
        framesCount: result.framesCount ?? null,
        analysisError: result.errorMessage ?? null,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async saveTrainingRunResult(
    runId: string,
    result: { status: 'DONE' | 'ERROR'; modelPath?: string; metrics?: string; errorMsg?: string },
  ) {
    return this.db.trainingRun.update({
      where: { id: runId },
      data: {
        status: result.status,
        modelPath: result.modelPath ?? null,
        metrics: result.metrics ?? null,
        errorMsg: result.errorMsg ?? null,
      },
      include: { startedBy: { select: { id: true, name: true, email: true } } },
    });
  }
}
