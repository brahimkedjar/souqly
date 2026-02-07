import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDeliveryDto {
  @IsOptional()
  pickupAddress?: any;

  @IsOptional()
  dropoffAddress?: any;

  @IsOptional()
  @IsNumber()
  pickupLat?: number;

  @IsOptional()
  @IsNumber()
  pickupLng?: number;

  @IsOptional()
  @IsNumber()
  dropoffLat?: number;

  @IsOptional()
  @IsNumber()
  dropoffLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
