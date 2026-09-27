import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read handler metadata first, then fall back to the controller class.
    // (Previously only the handler was read, so a class-level @Roles() was
    // silently ignored and those routes were open to every logged-in user.)
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.role) {
      return false;
    }

    const normalizedRole = String(user.role).toLowerCase();
    return roles.some((role) => role.toLowerCase() === normalizedRole);
  }
}
