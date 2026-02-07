import { IsString } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  storeId: string;

  @IsString()
  sellerId: string;
}

