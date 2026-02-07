import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQty: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  attributes?: any;

  @IsString()
  @IsUUID()
  categoryId: string;
}
