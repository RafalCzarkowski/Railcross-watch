import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InternalGuard } from '../videos/internal.guard';
import { TrainingAssetsService } from './training-assets.service';

class AssetAnalysisResultDto {
  @IsIn(['DONE', 'ERROR']) status!: 'DONE' | 'ERROR';
  @IsOptional() @IsString() detectionsJson?: string;
  @IsOptional() @IsString() errorMessage?: string;
}

class ExtractionResultDto {
  @IsIn(['DONE', 'ERROR']) status!: 'DONE' | 'ERROR';
  @IsOptional() @IsString() framesDir?: string;
  @IsOptional() @IsInt() @Min(0) framesCount?: number;
  @IsOptional() @IsString() errorMessage?: string;
}

class TrainingRunResultDto {
  @IsIn(['DONE', 'ERROR']) status!: 'DONE' | 'ERROR';
  @IsOptional() @IsString() modelPath?: string;
  @IsOptional() @IsString() metrics?: string;
  @IsOptional() @IsString() errorMsg?: string;
}

@ApiExcludeController()
@Controller('internal')
@UseGuards(InternalGuard)
export class TrainingInternalController {
  constructor(private readonly trainingAssetsService: TrainingAssetsService) {}

  @Post('training-assets/:id/analysis-result')
  @HttpCode(200)
  saveAnalysis(@Param('id') id: string, @Body() dto: AssetAnalysisResultDto) {
    return this.trainingAssetsService.saveAssetAnalysisResult(id, dto);
  }

  @Post('training-assets/:id/extraction-result')
  @HttpCode(200)
  saveExtraction(@Param('id') id: string, @Body() dto: ExtractionResultDto) {
    return this.trainingAssetsService.saveExtractionResult(id, dto);
  }

  @Post('training-runs/:id/result')
  @HttpCode(200)
  saveRunResult(@Param('id') id: string, @Body() dto: TrainingRunResultDto) {
    return this.trainingAssetsService.saveTrainingRunResult(id, dto);
  }
}
