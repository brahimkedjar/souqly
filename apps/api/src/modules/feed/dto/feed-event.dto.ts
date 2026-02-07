import { IsEnum, IsString } from 'class-validator';
import { FeedAction } from '@prisma/client';

export class FeedEventDto {
  @IsString()
  listingId: string;

  @IsEnum(FeedAction)
  action: FeedAction;
}

