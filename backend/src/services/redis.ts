import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../utils/logger'

let redis: Redis | null = null

/**
 * Connect to Redis and return the client instance.
 */
export function connectToRedis(): Redis {
  if (redis) return redis

  redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000)
      return delay
    },
    lazyConnect: false,
  })

  redis.on('connect', () => logger.info('Connected to Redis'))
  redis.on('error', (err) => logger.error({ err }, 'Redis connection error'))

  return redis
}

/**
 * Get the Redis client instance.
 */
export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not connected')
  return redis
}

// ─── Rate Limiter ──────────────────────────────────────────────────────────

/**
 * Sliding window rate limiter.
 * Returns { allowed, remaining, resetIn } where resetIn is in seconds.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const r = getRedis()
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowKey = `ratelimit:${key}`

  // Remove entries outside the window
  await r.zremrangebyscore(windowKey, 0, now - windowMs)

  // Count current entries
  const count = await r.zcard(windowKey)

  if (count >= maxRequests) {
    const oldestEntry = await r.zrange(windowKey, 0, 0, 'WITHSCORES')
    const resetIn = oldestEntry.length >= 2
      ? Math.ceil((Number(oldestEntry[1]) + windowMs - now) / 1000)
      : windowSeconds
    return { allowed: false, remaining: 0, resetIn }
  }

  // Add current request
  await r.zadd(windowKey, now, `${now}:${Math.random()}`)
  await r.expire(windowKey, windowSeconds)

  return { allowed: true, remaining: maxRequests - count - 1, resetIn: windowSeconds }
}

// ─── Verification Attempt Tracking ─────────────────────────────────────────

/**
 * Track verification code attempts. Returns remaining attempts.
 * Returns -1 if locked out.
 */
export async function trackVerificationAttempt(
  identityKey: string,
  channel: string,
  maxAttempts: number = 5,
  lockoutSeconds: number = 600
): Promise<number> {
  const r = getRedis()
  const key = `verify_attempts:${channel}:${identityKey}`

  const current = await r.incr(key)
  if (current === 1) {
    await r.expire(key, lockoutSeconds)
  }

  if (current > maxAttempts) {
    return -1 // locked
  }

  return maxAttempts - current
}

/**
 * Reset verification attempts after successful verification.
 */
export async function resetVerificationAttempts(
  identityKey: string,
  channel: string
): Promise<void> {
  const r = getRedis()
  await r.del(`verify_attempts:${channel}:${identityKey}`)
}

// ─── OAuth Session Storage ─────────────────────────────────────────────────

/**
 * Store an OAuth session (PKCE state + code verifier).
 */
export async function storeOAuthSession(
  state: string,
  data: { codeVerifier: string; identityKey: string }
): Promise<void> {
  const r = getRedis()
  await r.set(
    `oauth:${state}`,
    JSON.stringify({ ...data, createdAt: Date.now() }),
    'EX',
    600 // 10 minutes
  )
}

/**
 * Retrieve and delete an OAuth session.
 */
export async function consumeOAuthSession(
  state: string
): Promise<{ codeVerifier: string; identityKey: string } | null> {
  const r = getRedis()
  const data = await r.get(`oauth:${state}`)
  if (!data) return null
  await r.del(`oauth:${state}`)
  return JSON.parse(data)
}

/**
 * Store X refresh token (encrypted) for share posting.
 */
export async function storeXRefreshToken(
  identityKey: string,
  refreshToken: string
): Promise<void> {
  const r = getRedis()
  // Store with 30-day expiry
  await r.set(`x_refresh:${identityKey}`, refreshToken, 'EX', 2592000)
}

/**
 * Get stored X refresh token.
 */
export async function getXRefreshToken(
  identityKey: string
): Promise<string | null> {
  const r = getRedis()
  return r.get(`x_refresh:${identityKey}`)
}

// ─── Verified Attributes Storage ───────────────────────────────────────────

/**
 * Store verified attributes after successful platform verification.
 * Key: verified:{type}:{identityKey}  TTL: 24h
 */
export async function writeVerifiedAttributes(
  identityKey: string,
  type: string,
  attributes: Record<string, string>
): Promise<void> {
  const r = getRedis()
  await r.set(
    `verified:${type}:${identityKey}`,
    JSON.stringify(attributes),
    'EX',
    86400 // 24 hours
  )
}

/**
 * Check that a verification record exists and matches the given attributes.
 */
export async function findVerification(
  identityKey: string,
  type: string,
  attributes: Record<string, string>
): Promise<boolean> {
  const r = getRedis()
  const data = await r.get(`verified:${type}:${identityKey}`)
  if (!data) return false
  const stored: Record<string, string> = JSON.parse(data)
  return Object.entries(attributes).every(([k, v]) => stored[k] === v)
}

/**
 * Close Redis connection gracefully.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
    logger.info('Redis connection closed')
  }
}
