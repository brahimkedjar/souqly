import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDeliveryRequestDto {
  @IsString()
  courierId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  expiresInMinutes?: number;
}
