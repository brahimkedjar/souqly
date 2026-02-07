import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  slug: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  nameFr: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  nameAr: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
