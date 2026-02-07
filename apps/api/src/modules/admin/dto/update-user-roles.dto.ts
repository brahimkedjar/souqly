import { IsArray } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRolesDto {
  @IsArray()
  roles: Role[];
}

