import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across videos, users (admin), logs (admin)' })
  search(@Query('q') q: string, @CurrentUser() user: User) {
    if (!q || q.trim().length < 2) return { videos: [], users: [], logs: [] };
    const role = (user as any).role as string;
    const isOp = role === 'ADMIN' || role === 'SUPERADMIN';
    return this.searchService.search(q.trim(), isOp);
  }
}
