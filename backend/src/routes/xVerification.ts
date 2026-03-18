import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { rateLimiter } from '../middleware/rateLimiter'
import { validateBody } from '../middleware/validate'
import { generateAuthUrl, shareCertification } from '../services/twitter'
import { getRedis } from '../services/redis'
import { config } from '../config'
import { logger } from '../utils/logger'

const router = Router()

// ─── Get X OAuth 2.0 authorization URL ─────────────────────────────────────

router.post(
  '/api/verify/x/auth-url',
  rateLimiter(10, 600),
  async (req: Request, res: Response) => {
    try {
      const identityKey = req.auth.identityKey
      const { url, state } = await generateAuthUrl(identityKey)

      res.json({
        status: 'success',
        data: { authUrl: url, state },
        requestId: req.requestId,
      })
    } catch (err: any) {
      logger.error({ err }, 'Failed to generate X auth URL')
      res.status(500).json({
        status: 'error',
        message: 'Failed to initiate X verification. Please try again.',
        requestId: req.requestId,
      })
    }
  }
)

// ─── Check X verification status ───────────────────────────────────────────

router.post(
  '/api/verify/x/check',
  async (req: Request, res: Response) => {
    try {
      const identityKey = req.auth.identityKey

      const r = getRedis()
      const data = await r.get(`verified:x:${identityKey}`)
      const stored = data ? JSON.parse(data) as Record<string, string> : null

      if (stored && stored.userName && stored.profilePhoto) {
        res.json({
          status: 'success',
          data: {
            verified: true,
            userName: stored.userName,
            profilePhoto: stored.profilePhoto,
          },
          requestId: req.requestId,
        })
      } else {
        res.json({
          status: 'success',
          data: { verified: false },
          requestId: req.requestId,
        })
      }
    } catch (err: any) {
      logger.error({ err }, 'Failed to check X verification')
      res.status(500).json({
        status: 'error',
        message: 'Failed to check verification status.',
        requestId: req.requestId,
      })
    }
  }
)

// ─── Share certification on X ──────────────────────────────────────────────

const shareSchema = z.object({
  certType: z.enum(['email', 'phone', 'x']),
})

router.post(
  '/api/x/share',
  rateLimiter(3, 3600), // 3 shares per hour
  validateBody(shareSchema),
  async (req: Request, res: Response) => {
    try {
      const { certType } = req.body
      const identityKey = req.auth.identityKey

      const result = await shareCertification(identityKey, certType, config.FRONTEND_URL)

      res.json({
        status: 'success',
        data: result,
        requestId: req.requestId,
      })
    } catch (err: any) {
      logger.error({ err }, 'Failed to share on X')
      const statusCode = err.statusCode || 500
      res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Failed to share on X. Please try again.',
        requestId: req.requestId,
      })
    }
  }
)

export default router
