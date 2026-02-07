import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) {
      return true;
    }
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isBanned: true },
    });
    if (record?.isBanned) {
      throw new ForbiddenException({ message: 'User banned', code: 'USER_BANNED' });
    }
    return true;
  }
}
