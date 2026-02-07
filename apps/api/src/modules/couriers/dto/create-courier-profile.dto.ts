import { IsEnum, IsString, MaxLength } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateCourierProfileDto {
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsString()
  @MaxLength(30)
  phone: string;

  @IsString()
  @MaxLength(60)
  displayName: string;
}
