import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModerationStatus } from '@prisma/client';

export class UpdateListingStatusDto {
  @IsEnum(ModerationStatus)
  status: ModerationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
