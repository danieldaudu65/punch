import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  // How many proxies sit in front of the app. Locally 0-1; on Render behind
  // the Vercel rewrite it is 2 (Vercel, then Render's load balancer).
  // Getting this right makes the rate limiter see each student's real IP.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
});

const parsed = envSchema.safeParse(process.env);

// Fail fast on boot instead of crashing later with a confusing error.
if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
