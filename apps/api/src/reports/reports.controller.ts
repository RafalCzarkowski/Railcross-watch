import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public stats for login page — no auth required' })
  getPublicStats() {
    return this.reportsService.getPublicStats();
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get full analytics summary (admin only)' })
  getSummary(@CurrentUser() user: User) {
    const role = (user as any).role as string;
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new ForbiddenException('Admin only');
    return this.reportsService.getSummary();
  }
}