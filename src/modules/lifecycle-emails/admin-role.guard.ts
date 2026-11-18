import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

/**
 * Use after AuthGuard('jwt'). The existing admin controllers only check that a JWT is
 * valid, which any partner has; these endpoints can send email to every partner, so
 * they also require an admin role.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.PT_ADMIN)) return true;
    throw new ForbiddenException('Admin access required');
  }
}
