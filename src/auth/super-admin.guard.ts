import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRole } from '../entities/admin.entity';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.type !== 'admin') {
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }

    if (!user.admin || user.admin.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied. Super admin privileges required.');
    }

    return true;
  }
}

