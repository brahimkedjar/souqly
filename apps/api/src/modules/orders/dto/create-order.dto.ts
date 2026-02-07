import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class OrderItemInputDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  qty: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value == null ? value : value.toString().trim()))
  address?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value == null ? value : value.toString().trim()))
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}