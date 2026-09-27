import { BadRequestException } from '@nestjs/common';

/** Returns {before, after} containing only the keys whose values changed. */
export function diffFields(before: Record<string, any>, after: Record<string, any>, keys?: string[]) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of keys ?? Object.keys(after)) {
    const prev = before?.[key];
    const next = after?.[key];
    const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);
    if (JSON.stringify(norm(prev)) !== JSON.stringify(norm(next))) {
      b[key] = norm(prev);
      a[key] = norm(next);
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}

/** Parses an optional date input; throws a readable error for garbage. */
export function parseDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`${field} is not a valid date`);
  }
  return d;
}

export function requireFields(dto: Record<string, any>, fields: string[]) {
  const missing = fields.filter((f) => dto?.[f] === undefined || dto?.[f] === null || String(dto[f]).trim() === '');
  if (missing.length > 0) {
    throw new BadRequestException(`Missing required field(s): ${missing.join(', ')}`);
  }
}
