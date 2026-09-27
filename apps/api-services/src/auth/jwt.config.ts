import { Logger } from '@nestjs/common';

const DEV_FALLBACK_SECRET = 'livestocare-local-development-secret-do-not-use-in-production';
let warned = false;

/**
 * The signing secret must come from the environment in production. A weak or
 * missing secret would let anyone forge administrator tokens, so startup is
 * refused rather than silently falling back.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in production.');
  }
  if (!warned) {
    warned = true;
    new Logger('Auth').warn('JWT_SECRET is missing or shorter than 32 characters; using an insecure development secret.');
  }
  return DEV_FALLBACK_SECRET;
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '8h';
}

export const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
export const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);
