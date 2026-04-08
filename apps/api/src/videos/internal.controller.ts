import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { InternalGuard } from './internal.guard';
import { VideosService } from './videos.service';

class AnalysisResultDto {
  @IsIn(['DONE', 'ERROR']) status!: 'DONE' | 'ERROR';
  @IsOptional() @IsString() detectionsJson?: string;
  @IsOptional() @IsString() annotatedPath?: string;
  @IsOptional() @IsString() errorMessage?: string;
}

@ApiExcludeController()
@Controller('internal/videos')
@UseGuards(InternalGuard)
export class InternalController {
  constructor(private readonly videosService: VideosService) {}

  @Post(':id/analysis-result')
  @HttpCode(200)
  saveResult(@Param('id') id: string, @Body() dto: AnalysisResultDto) {
    return this.videosService.saveAnalysisResult(id, dto);
  }
}
