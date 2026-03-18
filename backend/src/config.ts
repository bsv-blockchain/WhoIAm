import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  // BSV / Wallet
  SERVER_PRIVATE_KEY: z.string().min(1, 'SERVER_PRIVATE_KEY is required'),
  BSV_NETWORK: z.enum(['main', 'test']).default('main'),
  WALLET_STORAGE_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_SERVICE_SID: z.string().min(1, 'TWILIO_SERVICE_SID is required'),

  // X / Twitter OAuth 2.0
  X_CLIENT_ID: z.string().min(1, 'X_CLIENT_ID is required'),
  X_CLIENT_SECRET: z.string().min(1, 'X_CLIENT_SECRET is required'),
  X_REDIRECT_URI: z.string().url().default('http://localhost:8080/api/verify/x/callback'),

  // Google OAuth 2.0
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:8080/api/verify/google/callback'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HTTP_PORT: z.coerce.number().default(8080),
  HOSTING_DOMAIN: z.string().default('http://localhost:8080'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

function loadConfig() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n')
    console.error(`\n[config] Invalid environment variables:\n${missing}\n`)
    process.exit(1)
  }
  return parsed.data
}

export const config = loadConfig()
export type Config = z.infer<typeof envSchema>
