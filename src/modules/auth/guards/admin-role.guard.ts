import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Admin-only access. Use after AuthGuard('jwt'): `@UseGuards(AuthGuard('jwt'), AdminRoleGuard)`.
 *
 * The /admin controllers used to check only that a JWT was valid, which every partner has,
 * so any partner could call them (including the bulk earnings upload). `request.user` is the
 * user re-loaded from the database by JwtStrategy, so the role is current, not whatever the
 * token said when it was issued. Admin and PT admin are both allowed, matching the frontend's
 * withAuth(['admin', 'pt_admin']) on every admin page.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.PT_ADMIN)) return true;
    throw new ForbiddenException('Admin access required');
  }
}
