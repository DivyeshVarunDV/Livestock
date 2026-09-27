import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Fixed-window, in-memory limiter for credential endpoints (per client IP).
 * Complements per-account lockout by slowing password spraying across many
 * accounts. For multi-instance deployments put an equivalent limit at the
 * reverse proxy / API gateway.
 */
@Injectable()
export class LoginRateLimiter {
  private readonly windowMs = Number(process.env.LOGIN_RATE_WINDOW_MS || 60_000);
  private readonly max = Number(process.env.LOGIN_RATE_MAX || 20);
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  consume(key: string, now = Date.now()) {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return;
    }
    entry.count += 1;
    if (entry.count > this.max) {
      throw new HttpException(
        `Too many attempts. Please wait ${Math.ceil((entry.resetAt - now) / 1000)} seconds and try again.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private prune(now: number) {
    if (this.hits.size < 10_000) return;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}
