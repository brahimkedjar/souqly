import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { parsePagination } from '../../common/utils/pagination';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @Get('mine')
  async mine(@CurrentUser() user: any, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.reportsService.listMine(user.id, page, limit);
  }
}
