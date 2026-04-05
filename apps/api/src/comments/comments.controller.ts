import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;

  @IsString()
  @IsNotEmpty()
  videoId!: string;
}

@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get comments for a video' })
  findByVideo(@Query('videoId') videoId: string) {
    return this.commentsService.findByVideo(videoId);
  }

  @Post()
  @ApiOperation({ summary: 'Add comment to a video' })
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: User) {
    return this.commentsService.create(dto.videoId, dto.body, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author or admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const role = (user as any).role as string;
    return this.commentsService.remove(id, user.id, role);
  }
}
