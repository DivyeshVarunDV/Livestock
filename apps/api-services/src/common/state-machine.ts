import { BadRequestException } from '@nestjs/common';

export type TransitionMap = Record<string, readonly string[]>;

/**
 * Throws unless `from -> to` is a permitted workflow transition.
 * A no-op transition (from === to) is always allowed so that other fields
 * (e.g. remarks) can be edited without changing the status.
 */
export function assertTransition(map: TransitionMap, from: string, to: string, entity: string) {
  if (!(to in map)) {
    throw new BadRequestException(`Invalid ${entity} status "${to}". Allowed: ${Object.keys(map).join(', ')}`);
  }
  if (from === to) return;
  const allowed = map[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `${entity} cannot move from ${from} to ${to}. Allowed next states: ${allowed.length ? allowed.join(', ') : 'none (final state)'}`,
    );
  }
}
