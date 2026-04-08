import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalGuard } from '../videos/internal.guard';
import { TrainingAssetsController } from './training-assets.controller';
import { TrainingAssetsService } from './training-assets.service';
import { TrainingInternalController } from './training-internal.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingAssetsController, TrainingInternalController],
  providers: [TrainingAssetsService, InternalGuard],
})
export class TrainingAssetsModule {}
