import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UpdateListingStatusDto } from './dto/update-listing-status.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { parsePagination } from '../../common/utils/pagination';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { UpdateUserBanDto } from './dto/update-user-ban.dto';
import { CurrentUser } from '../users/user.decorator';
import { ReportStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reports')
  async reports(@Query() query: any) {
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const status = query.status as ReportStatus | undefined;
    return this.adminService.listReports(status, limit, query.cursor);
  }

  @Patch('reports/:id')
  async updateReport(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateReportStatusDto) {
    return this.adminService.updateReportStatus(id, dto.status, dto.resolutionNote, user.id);
  }

  @Get('listings')
  async listings(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    const status = query.status as string | undefined;
    return this.adminService.listListings(status, page, limit);
  }

  @Patch('listings/:id/status')
  async updateListing(@Param('id') id: string, @Body() dto: UpdateListingStatusDto) {
    return this.adminService.updateListingModeration(id, dto.status, dto.reason);
  }

  @Delete('listings/:id')
  async deleteListing(@Param('id') id: string) {
    return this.adminService.deleteListing(id);
  }

  @Get('users')
  async users(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.adminService.listUsers(page, limit);
  }

  @Patch('users/:id/roles')
  async updateRoles(@Param('id') id: string, @Body() dto: UpdateUserRolesDto) {
    return this.adminService.updateUserRoles(id, dto.roles);
  }

  @Patch('users/:id/ban')
  async banUser(@Param('id') id: string, @Body() dto: UpdateUserBanDto) {
    return this.adminService.updateUserBan(id, dto.isBanned, dto.reason);
  }

  @Get('stats')
  async stats() {
    return this.adminService.stats();
  }
}
