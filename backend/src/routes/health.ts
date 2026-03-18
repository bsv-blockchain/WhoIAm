import { Router, Request, Response } from 'express'
import { getRedis } from '../services/redis'

const router = Router()

router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {}

  // Check Redis
  try {
    const redis = getRedis()
    await redis.ping()
    checks.redis = 'healthy'
  } catch {
    checks.redis = 'unhealthy'
  }

  const allHealthy = Object.values(checks).every((v) => v === 'healthy')
  const status = allHealthy ? 200 : 503

  res.status(status).json({
    status: allHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  })
})

export default router
