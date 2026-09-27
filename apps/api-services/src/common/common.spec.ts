import { BadRequestException } from '@nestjs/common';
import { generateCode } from './codes';
import { assertTransition } from './state-machine';
import { diffFields, parseDate } from './diff';
import { passwordPolicyViolations } from '../auth/password-policy';

describe('generateCode', () => {
  it('has a prefix, date stamp and random suffix', () => {
    expect(generateCode('RX', new Date('2026-09-27T00:00:00Z'))).toMatch(/^RX-260927-[2-9A-HJ-NP-Z]{6}$/);
  });

  it('does not repeat across many calls', () => {
    const codes = new Set(Array.from({ length: 5000 }, () => generateCode('X')));
    expect(codes.size).toBe(5000);
  });
});

describe('assertTransition', () => {
  const map = { OPEN: ['CLOSED'], CLOSED: [] } as const;

  it('permits declared transitions and no-ops', () => {
    expect(() => assertTransition(map, 'OPEN', 'CLOSED', 'Case')).not.toThrow();
    expect(() => assertTransition(map, 'CLOSED', 'CLOSED', 'Case')).not.toThrow();
  });

  it('rejects undeclared transitions and unknown states', () => {
    expect(() => assertTransition(map, 'CLOSED', 'OPEN', 'Case')).toThrow(/final state/);
    expect(() => assertTransition(map, 'OPEN', 'BOGUS', 'Case')).toThrow(BadRequestException);
  });
});

describe('diffFields / parseDate', () => {
  it('reports only changed keys', () => {
    expect(diffFields({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ before: { b: 2 }, after: { b: 3 }, changed: true });
  });

  it('rejects invalid dates', () => {
    expect(() => parseDate('not-a-date', 'x')).toThrow(BadRequestException);
    expect(parseDate('', 'x')).toBeNull();
  });
});

describe('password policy', () => {
  it('accepts a strong password', () => {
    expect(passwordPolicyViolations('AgriShield#2026')).toEqual([]);
  });

  it('lists every unmet rule', () => {
    expect(passwordPolicyViolations('short')).toEqual(
      expect.arrayContaining(['at least 10 characters', 'an uppercase letter', 'a digit', 'a special character']),
    );
  });
});
