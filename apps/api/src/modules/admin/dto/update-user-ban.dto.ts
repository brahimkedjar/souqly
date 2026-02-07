import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserBanDto {
  @IsBoolean()
  isBanned: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
