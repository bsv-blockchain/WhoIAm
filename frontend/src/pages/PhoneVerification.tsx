import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { ProgressStepper } from '@/components/ProgressStepper'
import { CodeInput } from '@/components/CodeInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, Loader2, ArrowLeft, RefreshCw, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { getWalletClient, getAuthFetch, getIdentityClient } from '@/lib/wallet'
import { getCertifierConfig, getApiBaseUrl, CERTIFICATE_TYPES } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

const steps = [{ label: 'Enter Phone' }, { label: 'Verify Code' }, { label: 'Visibility' }, { label: 'Done' }]

export default function PhoneVerification() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(5)
  const certRef = useRef<any>(null)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number')
      return
    }

    setIsSubmitting(true)
    try {
      const authFetch = getAuthFetch()
      const res = await authFetch.fetch(`${getApiBaseUrl()}/api/verify/phone/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      const data = await res.json()
      if (data.status === 'success' && data.data.textSentStatus) {
        toast.success('Verification code sent!')
        setStep(1)
      } else {
        toast.error('Failed to send verification text')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification text')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (code: string) => {
    setIsSubmitting(true)
    try {
      const authFetch = getAuthFetch()
      const res = await authFetch.fetch(`${getApiBaseUrl()}/api/verify/phone/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code }),
      })
      const data = await res.json()

      if (data.status === 'success' && data.data.verificationStatus) {
        toast.success('Phone verified!')

        const wallet = getWalletClient()
        const { certifierPublicKey, certifierUrl } = await getCertifierConfig()
        const newCert = await wallet.acquireCertificate({
          certifier: certifierPublicKey,
          certifierUrl,
          type: CERTIFICATE_TYPES.phone,
          acquisitionProtocol: 'issuance',
          fields: { phoneNumber },
        })
        certRef.current = newCert
        setStep(2)
      } else {
        const remaining = data.data?.remainingAttempts ?? remainingAttempts - 1
        setRemainingAttempts(remaining)
        toast.error(`Invalid code. ${remaining} attempts remaining.`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReveal = async (reveal: boolean) => {
    if (reveal && certRef.current) {
      setIsRevealing(true)
      try {
        await getIdentityClient().publiclyRevealAttributes(certRef.current, ['phoneNumber'])
        toast.success('Your phone number is now publicly discoverable')
      } catch {
        toast.warning('Certificate issued but public revelation failed')
      } finally {
        setIsRevealing(false)
      }
    }
    setStep(3)
  }

  const handleResend = async () => {
    try {
      const authFetch = getAuthFetch()
      await authFetch.fetch(`${getApiBaseUrl()}/api/verify/phone/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      toast.success('New code sent!')
    } catch {
      toast.error('Failed to resend code')
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">
        <ProgressStepper steps={steps} currentStep={step} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardContent className="p-5 sm:p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-6">
                    <Phone className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">Verify your phone</h2>
                  <p className="text-sm text-text-secondary mb-6">Enter your phone number and we'll send a verification code via SMS.</p>

                  <form onSubmit={handleSendCode} className="space-y-4">
                    <PhoneInput
                      defaultCountry="US"
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value || '')}
                      className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting || !phoneNumber}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Send verification code
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardContent className="p-5 sm:p-8 text-center">
                  <h2 className="text-xl font-semibold text-text-primary mb-2">Check your phone</h2>
                  <p className="text-sm text-text-secondary mb-8">
                    Enter the 6-digit code sent to <span className="font-medium text-text-primary">{phoneNumber}</span>
                  </p>
                  <CodeInput onComplete={handleVerifyCode} disabled={isSubmitting} />
                  {isSubmitting && (
                    <div className="flex items-center justify-center gap-2 mt-6 text-sm text-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </div>
                  )}
                  <div className="mt-6 space-y-2">
                    <button onClick={handleResend} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer">
                      <RefreshCw className="h-3 w-3" /> Resend code
                    </button>
                    <p className="text-xs text-text-secondary">Attempts remaining: {remainingAttempts}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card>
                <CardContent className="p-5 sm:p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto mb-4">
                    <Phone className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    {phoneNumber} verified
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Your certificate is in your wallet. Do you want others to be able to find you by your phone number?
                  </p>

                  <div className="space-y-3 mb-6 text-left">
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">If public</p>
                      <p className="text-sm text-text-primary">
                        Anyone who knows <span className="font-medium">{phoneNumber}</span> can look up your identityKey. Apps show your number instead of your key.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">If private</p>
                      <p className="text-sm text-text-primary">
                        Your phone number is not searchable. Only people you share your certificate with directly can verify the link.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => handleReveal(false)} disabled={isRevealing}>
                      <Lock className="h-4 w-4" /> Keep private
                    </Button>
                    <Button className="flex-1" onClick={() => handleReveal(true)} disabled={isRevealing}>
                      {isRevealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                      Make public
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card>
                <CardContent className="p-5 sm:p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto mb-4">
                    <Phone className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">Phone Verified!</h2>
                  <p className="text-sm text-text-secondary mb-6">Your phone certificate has been issued and stored in your wallet.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => navigate('/certificates')}>View Certificates</Button>
                    <Button variant="outline" onClick={() => navigate('/')}>Verify Another</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 2 && (
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => step === 0 ? navigate('/') : setStep(0)}>
              <ArrowLeft className="h-4 w-4" /> Go back
            </Button>
          </div>
        )}
      </div>
    </Shell>
  )
}
