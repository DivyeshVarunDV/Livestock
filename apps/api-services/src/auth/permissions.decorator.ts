import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions';

export const PERMISSIONS_KEY = 'permissions';
export const IS_PUBLIC_KEY = 'isPublic';
export const AUTHENTICATED_KEY = 'authenticatedOnly';

/** The caller must hold ALL of the listed permissions. */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/** No authentication required (login, public verification, health probe). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Any authenticated, active user may call the route; the service is
 * responsible for scoping data to the caller (e.g. own notifications).
 */
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
