import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { LogsService } from './logs.service';

@ApiTags('logs')
@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'List activity logs (admin only)' })
  findAll(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const role = (user as any).role as string;
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new ForbiddenException('Admin only');
    return this.logsService.findAll(limit ? parseInt(limit, 10) : 10, search);
  }
}
