import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingIntent, ListingStatus } from '@prisma/client';

export class UpdateUsedListingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  conditionScore?: number;

  @IsOptional()
  @IsEnum(ListingIntent)
  intent?: ListingIntent;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceOverride?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  exchangeWanted?: string;

  @IsOptional()
  @IsString()
  exchangeCategoryId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}