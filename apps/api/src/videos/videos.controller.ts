import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream, statSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { VideosService } from './videos.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CreateLinkDto } from './dto/create-link.dto';

type CallerRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

function callerRole(user: User): CallerRole {
  return (user as any).role as CallerRole;
}

function requireOperator(user: User) {
  const role = callerRole(user);
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new ForbiddenException('Admin only');
}

@ApiTags('videos')
@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a crossing video file' })
  async upload(@Req() req: FastifyRequest, @CurrentUser() user: User) {
    const data = await req.file();
    if (!data) throw new Error('No file provided');
    return this.videosService.upload(
      { filename: data.filename, mimetype: data.mimetype, file: data.file },
      user.id,
      callerRole(user),
    );
  }

  @Post('link')
  @ApiOperation({ summary: 'Add a YouTube or stream link' })
  addLink(@Body() dto: CreateLinkDto, @CurrentUser() user: User) {
    return this.videosService.createLink(dto, user.id, callerRole(user));
  }

  @Get()
  @ApiOperation({ summary: 'List crossing videos (admins see all, users see approved + own)' })
  findAll(@CurrentUser() user: User) {
    return this.videosService.findAll(user.id, callerRole(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video metadata' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.videosService.findOne(id, user.id, callerRole(user));
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream video file (FILE type only)' })
  async stream(@Param('id') id: string, @CurrentUser() user: User, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const filePath = await this.videosService.getFilePath(id, user.id, callerRole(user));
    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers['range'];

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      reply
        .status(206)
        .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', chunkSize)
        .header('Content-Type', 'video/mp4');
      return reply.send(createReadStream(filePath, { start, end }));
    }

    reply.header('Content-Length', fileSize).header('Content-Type', 'video/mp4');
    return reply.send(createReadStream(filePath));
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending video (admin only)' })
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    requireOperator(user);
    return this.videosService.approve(id, user.id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a pending video (admin only)' })
  reject(@Param('id') id: string, @CurrentUser() user: User) {
    requireOperator(user);
    return this.videosService.reject(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update video metadata' })
  update(@Param('id') id: string, @Body() dto: UpdateVideoDto, @CurrentUser() user: User) {
    return this.videosService.update(id, dto, user.id, callerRole(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete video' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.videosService.remove(id, user.id, callerRole(user));
  }
}
