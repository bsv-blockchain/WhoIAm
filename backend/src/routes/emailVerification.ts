import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate'
import { rateLimiter } from '../middleware/rateLimiter'
import { sendEmailVerification, checkEmailVerification } from '../services/twilio'
import { writeVerifiedAttributes } from '../services/redis'
import { trackVerificationAttempt, resetVerificationAttempts } from '../services/redis'
import { logger } from '../utils/logger'

const router = Router()

// ─── Send email verification code ──────────────────────────────────────────

const sendEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

router.post(
  '/api/verify/email/send',
  rateLimiter(5, 600), // 5 sends per 10 minutes
  validateBody(sendEmailSchema),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      const identityKey = req.auth.identityKey

      logger.info({ identityKey, email }, 'Sending email verification')

      const result = await sendEmailVerification(email)

      res.json({
        status: 'success',
        data: {
          emailSentStatus: result.sent,
          sentEmail: result.to,
        },
        requestId: req.requestId,
      })
    } catch (err: any) {
      logger.error({ err }, 'Failed to send email verification')
      res.status(500).json({
        status: 'error',
        message: 'Failed to send verification email. Please try again.',
        requestId: req.requestId,
      })
    }
  }
)

// ─── Check email verification code ─────────────────────────────────────────

const checkEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
})

router.post(
  '/api/verify/email/check',
  rateLimiter(10, 600), // 10 checks per 10 minutes
  validateBody(checkEmailSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body
      const identityKey = req.auth.identityKey

      // Track attempts
      const remaining = await trackVerificationAttempt(identityKey, 'email')
      if (remaining < 0) {
        res.status(429).json({
          status: 'error',
          message: 'Too many attempts. Please wait 10 minutes.',
          requestId: req.requestId,
        })
        return
      }

      const result = await checkEmailVerification(email, code)

      if (result.verified) {
        // Store verified attributes
        await writeVerifiedAttributes(identityKey, 'email', { email })
        await resetVerificationAttempts(identityKey, 'email')

        logger.info({ identityKey, email }, 'Email verified successfully')

        res.json({
          status: 'success',
          data: {
            verificationStatus: true,
            verifiedEmail: email,
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
      logger.error({ err }, 'Failed to check email verification')
      res.status(500).json({
        status: 'error',
        message: 'Verification check failed. Please try again.',
        requestId: req.requestId,
      })
    }
  }
)

export default router
