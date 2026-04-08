import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { InternalController } from './internal.controller';
import { InternalGuard } from './internal.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [VideosController, InternalController],
  providers: [VideosService, InternalGuard],
})
export class VideosModule {}
