import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CourierStatus, VehicleType } from '@prisma/client';

export class UpdateCourierProfileDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @IsOptional()
  @IsEnum(CourierStatus)
  status?: CourierStatus;
}
