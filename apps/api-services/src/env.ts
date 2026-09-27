import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Loads `.env` from the service directory (if present) before anything else
 * reads configuration. Variables already set in the real environment win.
 */
const envFile = resolve(__dirname, '..', '.env');
if (existsSync(envFile) && typeof (process as any).loadEnvFile === 'function') {
  (process as any).loadEnvFile(envFile);
}
