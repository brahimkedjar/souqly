import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ListingStatus } from '@prisma/client';

export class CreateListingDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  titleOverride?: string;

  @IsOptional()
  @IsString()
  descriptionOverride?: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
