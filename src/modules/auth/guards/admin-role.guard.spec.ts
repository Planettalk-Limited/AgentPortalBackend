import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from './admin-role.guard';
import { UserRole } from '../../users/entities/user.entity';
import { AdminSystemController } from '../../admin/admin-system.controller';
import { FixUserDataController } from '../../admin/fix-user-data.controller';
import { AdminAgentsController } from '../../agents/admin-agents.controller';
import { AdminApplicationsController } from '../../agents/admin-applications.controller';
import { AdminEarningsController } from '../../agents/admin-earnings.controller';
import { AdminPayoutsController } from '../../agents/admin-payouts.controller';
import { AdminEmailTestController } from '../../email/admin-email-test.controller';
import { AdminTemplatesController } from '../../email/admin-templates.controller';
import { AdminNotificationsController } from '../../notifications/admin-notifications.controller';
import { AdminResourcesController } from '../../resources/admin-resources.controller';
import { AdminTasksController } from '../../tasks/admin-tasks.controller';
import { AdminTrainingController } from '../../training/admin-training.controller';
import { AdminUsersController } from '../../users/admin-users.controller';

const contextFor = (user: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();

  it.each([UserRole.ADMIN, UserRole.PT_ADMIN])('lets %s through', (role) => {
    expect(guard.canActivate(contextFor({ id: 'u1', role }))).toBe(true);
  });

  it('refuses a partner (agent) with 403', () => {
    expect(() => guard.canActivate(contextFor({ id: 'u1', role: UserRole.AGENT }))).toThrow(ForbiddenException);
  });

  it('refuses a request with no authenticated user', () => {
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});

// Every /admin controller must require BOTH a valid login and an admin role. Before this,
// they only checked the login, so any partner could call them (bulk earnings upload included).
// A new admin controller without the role guard fails here.
describe.each([
  AdminSystemController,
  FixUserDataController,
  AdminAgentsController,
  AdminApplicationsController,
  AdminEarningsController,
  AdminPayoutsController,
  AdminEmailTestController,
  AdminTemplatesController,
  AdminNotificationsController,
  AdminResourcesController,
  AdminTasksController,
  AdminTrainingController,
  AdminUsersController,
])('%p', (controller) => {
  it('requires a JWT and then the admin role', () => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
    const jwtIndex = guards.findIndex((g) => g === AuthGuard('jwt'));
    const roleIndex = guards.indexOf(AdminRoleGuard);
    expect(jwtIndex).toBeGreaterThanOrEqual(0);
    expect(roleIndex).toBeGreaterThan(jwtIndex);
  });
});
