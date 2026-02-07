import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !Array.isArray(user.roles) || !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException({ message: 'Admin only', code: 'ADMIN_ONLY' });
    }
    return true;
  }
}
