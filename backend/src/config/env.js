import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url('SUPABASE_URL phải là một URL hợp lệ'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY không được để trống'),
  CORS_ORIGINS: z.string().default('http://localhost:5173')
});

const isTest = process.env.NODE_ENV === 'test';

const parseResult = envSchema.safeParse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL || (isTest ? 'https://example.supabase.co' : undefined),
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || (isTest ? 'test-anon-key' : undefined),
  CORS_ORIGINS: process.env.CORS_ORIGINS || (isTest ? 'http://localhost:5173' : undefined)
});

if (!parseResult.success) {
  const missingOrInvalid = parseResult.error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
  throw new Error(`[ENV ERROR] Biến môi trường không hợp lệ hoặc bị thiếu: ${missingOrInvalid}`);
}

export const env = {
  ...parseResult.data,
  corsOriginsList: parseResult.data.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
};

