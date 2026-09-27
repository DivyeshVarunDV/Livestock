import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, permissionsForRole } from './permissions';
import { AUTHENTICATED_KEY, IS_PUBLIC_KEY, PERMISSIONS_KEY } from './permissions.decorator';
import { ROLES_KEY } from './roles.decorator';

/**
 * Registered globally after JwtAuthGuard. Default-deny: a non-public route
 * that declares no access policy (@RequirePermissions, @Roles or
 * @Authenticated) is rejected, so a newly added endpoint can never be
 * accidentally exposed.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, targets);
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    const authenticatedOnly = this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets);

    const user = context.switchToHttp().getRequest().user;
    if (!user?.role) throw new ForbiddenException('Not authenticated');

    if (required && required.length > 0) {
      const granted = permissionsForRole(user.role);
      const missing = required.filter((p) => !granted.includes(p));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Your role (${String(user.role).toUpperCase()}) is not authorised for this action. Missing permission: ${missing.join(', ')}`,
        );
      }
      return true;
    }

    // Role-based routes are enforced by RolesGuard; authenticated-only routes are scoped in services.
    if ((roles && roles.length > 0) || authenticatedOnly) return true;

    throw new ForbiddenException('This endpoint has no access policy configured.');
  }
}
