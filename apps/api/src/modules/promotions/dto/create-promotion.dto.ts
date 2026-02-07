import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreatePromotionDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  discountPct?: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}

