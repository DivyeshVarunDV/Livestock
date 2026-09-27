import { BadRequestException } from '@nestjs/common';

export const PASSWORD_MIN_LENGTH = 10;
export const BCRYPT_ROUNDS = 12;

/** Returns human-readable violations of the password policy (empty = OK). */
export function passwordPolicyViolations(password: unknown): string[] {
  if (typeof password !== 'string') return ['Password is required'];
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) errors.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  if (password.length > 128) errors.push('at most 128 characters');
  if (!/[a-z]/.test(password)) errors.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('an uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('a digit');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('a special character');
  return errors;
}

export function assertStrongPassword(password: unknown) {
  const errors = passwordPolicyViolations(password);
  if (errors.length > 0) {
    throw new BadRequestException(`Password must contain ${errors.join(', ')}.`);
  }
}
