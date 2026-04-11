import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrainingAssetsService } from './training-assets.service';

class StartTrainingDto {
  @IsOptional() @IsInt() @Min(1) epochs?: number;
}

class UpdateTrainingAssetDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

type CallerRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

function callerRole(user: User): CallerRole {
  return (user as any).role as CallerRole;
}

function requireOperator(user: User) {
  const role = callerRole(user);
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new ForbiddenException('Admin only');
}

function getFieldValue(field: Multipart | Multipart[] | undefined): string | undefined {
  if (!field || Array.isArray(field)) return undefined;
  if ((field as MultipartFile).file) return undefined;
  return typeof (field as { value?: unknown }).value === 'string'
    ? ((field as { value?: string }).value)
    : undefined;
}

@ApiTags('training-assets')
@Controller('training-assets')
@UseGuards(JwtAuthGuard)
export class TrainingAssetsController {
  constructor(private readonly trainingAssetsService: TrainingAssetsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload training video (admin or superadmin)' })
  async upload(@Req() req: FastifyRequest, @CurrentUser() user: User) {
    requireOperator(user);
    const data = await req.file();
    if (!data) throw new Error('No file provided');

    const title = getFieldValue(data.fields.title);
    const notes = getFieldValue(data.fields.notes);
    const rawTags = getFieldValue(data.fields.tags) ?? '';
    const tags = rawTags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter(Boolean);

    return this.trainingAssetsService.upload(
      { filename: data.filename, mimetype: data.mimetype, file: data.file },
      user.id,
      callerRole(user),
      { title, notes, tags },
    );
  }

  @Get()
  @ApiOperation({ summary: 'List training videos (admin or superadmin)' })
  findAll(@CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.findAll(callerRole(user));
  }

  @Get('runs')
  @ApiOperation({ summary: 'List training runs' })
  listRuns(@CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.listTrainingRuns(callerRole(user));
  }

  @Post('train')
  @ApiOperation({ summary: 'Start YOLO26 fine-tuning run' })
  startTraining(@Body() dto: StartTrainingDto, @CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.startTraining(callerRole(user), user.id, dto.epochs ?? 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training asset by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.findOne(id, callerRole(user));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update training asset metadata' })
  update(@Param('id') id: string, @Body() dto: UpdateTrainingAssetDto, @CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.update(id, callerRole(user), dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete training asset' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.remove(id, callerRole(user), user.id);
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Enqueue analysis for training asset' })
  analyze(@Param('id') id: string, @CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.enqueueAnalysis(id, callerRole(user), user.id);
  }

  @Post(':id/extract-frames')
  @ApiOperation({ summary: 'Enqueue frame extraction for training asset' })
  extractFrames(@Param('id') id: string, @CurrentUser() user: User) {
    requireOperator(user);
    return this.trainingAssetsService.enqueueExtraction(id, callerRole(user), user.id);
  }
}
