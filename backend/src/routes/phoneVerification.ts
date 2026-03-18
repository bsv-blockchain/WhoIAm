import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate'
import { rateLimiter } from '../middleware/rateLimiter'
import { sendPhoneVerification, checkPhoneVerification } from '../services/twilio'
import { writeVerifiedAttributes } from '../services/redis'
import { trackVerificationAttempt, resetVerificationAttempts } from '../services/redis'
import { logger } from '../utils/logger'

const router = Router()

// ─── Send phone verification code ──────────────────────────────────────────

const sendPhoneSchema = z.object({
  phoneNumber: z.string().min(8, 'Invalid phone number').max(20),
})

router.post(
  '/api/verify/phone/send',
  rateLimiter(5, 600), // 5 sends per 10 minutes
  validateBody(sendPhoneSchema),
  async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body
      const identityKey = req.auth.identityKey

      logger.info({ identityKey, phoneNumber }, 'Sending phone verification')

      const result = await sendPhoneVerification(phoneNumber)

      res.json({
        status: 'success',
        data: {
          textSentStatus: result.sent,
          textSentPhonenumber: result.to,
        },
        requestId: req.requestId,
      })
    } catch (err: any) {
      logger.error({ err }, 'Failed to send phone verification')
      res.status(500).json({
        status: 'error',
        message: 'Failed to send verification text. Please try again.',
        requestId: req.requestId,
      })
    }
  }
)

// ─── Check phone verification code ─────────────────────────────────────────

const checkPhoneSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  code: z.string().length(6, 'Code must be 6 digits'),
})

router.post(
  '/api/verify/phone/check',
  rateLimiter(10, 600),
  validateBody(checkPhoneSchema),
  async (req: Request, res: Response) => {
    try {
      const { phoneNumber, code } = req.body
      const identityKey = req.auth.identityKey

      // Track attempts
      const remaining = await trackVerificationAttempt(identityKey, 'phone')
      if (remaining < 0) {
        res.status(429).json({
          status: 'error',
          message: 'Too many attempts. Please wait 10 minutes.',
          requestId: req.requestId,
        })
        return
      }

      const result = await checkPhoneVerification(phoneNumber, code)

      if (result.verified) {
        await writeVerifiedAttributes(identityKey, 'phone', { phoneNumber })
        await resetVerificationAttempts(identityKey, 'phone')

        logger.info({ identityKey, phoneNumber }, 'Phone verified successfully')

        res.json({
          status: 'success',
          data: {
            verificationStatus: true,
            verifiedPhonenumber: phoneNumber,
          },
          requestId: req.requestId,
        })
      } else {
        res.json({
          status: 'success',
          data: {
            verificationStatus: false,
            remainingAttempts: remaining,
          },
          requestId: req.requestId,
        })
      }
    } catch (err: any) {
      logger.error({ err }, 'Failed to check phone verification')
      res.status(500).json({
        status: 'error',
        message: 'Verification check failed. Please try again.',
        requestId: req.requestId,
      })
    }
  }
)

export default router
