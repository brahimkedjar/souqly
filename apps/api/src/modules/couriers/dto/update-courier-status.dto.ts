import { IsEnum } from 'class-validator';
import { CourierStatus } from '@prisma/client';

export class UpdateCourierStatusDto {
  @IsEnum(CourierStatus)
  status: CourierStatus;
}
