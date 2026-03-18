import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { getWalletClient, getAuthFetch, getIdentityClient } from '@/lib/wallet'
import { getCertifierConfig, getApiBaseUrl, CERTIFICATE_TYPES } from '@/lib/constants'
import { motion } from 'framer-motion'

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

type Status = 'loading' | 'reveal' | 'success' | 'error'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isRevealing, setIsRevealing] = useState(false)
  const certRef = useRef<any>(null)

  useEffect(() => {
    async function process() {
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      const emailParam = searchParams.get('email')
      const nameParam = searchParams.get('name')
      const profilePhoto = searchParams.get('profilePhoto')

      if (error) {
        toast.error('Google verification failed')
        setStatus('error')
        return
      }

      if (success === 'true' && emailParam) {
        setEmail(emailParam)
        setName(nameParam || '')
        try {
          const wallet = getWalletClient()
          const { certifierPublicKey, certifierUrl } = await getCertifierConfig()

          const newCert = await wallet.acquireCertificate({
            certifier: certifierPublicKey,
            certifierUrl,
            type: CERTIFICATE_TYPES.google,
            acquisitionProtocol: 'issuance',
            fields: {
              email: emailParam,
              name: nameParam || '',
              profilePhoto: profilePhoto || '',
            },
          })

          certRef.current = newCert
          setStatus('reveal')
        } catch (err: any) {
          console.error('Certificate acquisition failed:', err)
          toast.error('Failed to issue certificate')
          setStatus('error')
        }
      } else {
        setStatus('error')
      }
    }

    process()
  }, [searchParams])

  const handleReveal = async (reveal: boolean) => {
    if (reveal && certRef.current) {
      setIsRevealing(true)
      try {
        await getIdentityClient().publiclyRevealAttributes(certRef.current, ['email', 'name', 'profilePhoto'])
        toast.success('Your Google account is now publicly discoverable')
      } catch {
        toast.warning('Certificate issued but public revelation failed')
      } finally {
        setIsRevealing(false)
      }
    }
    setStatus('success')
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="p-5 sm:p-8 text-center">
              {status === 'loading' && (
                <div className="py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-text-secondary">Issuing your certificate...</p>
                </div>
              )}

              {status === 'reveal' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-border mx-auto mb-4">
                    <GoogleLogo className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-1">
                    {name || email} verified
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Your certificate is in your wallet. Do you want others to be able to find you by your Google email?
                  </p>

                  <div className="space-y-3 mb-6 text-left">
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">If public</p>
                      <p className="text-sm text-text-primary">
                        Anyone who knows <span className="font-medium">{email}</span> can look up your identityKey. Apps show your name and profile picture instead of your key.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">If private</p>
                      <p className="text-sm text-text-primary">
                        Your email is not searchable. Only people you share your certificate with directly can verify the link.
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
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-border mx-auto mb-4">
                    <GoogleLogo className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">Google Account Verified!</h2>
                  <p className="text-sm text-text-secondary mb-6">
                    You now have a certificate proving that you own <span className="font-medium">{email}</span>.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => navigate('/certificates')}>View Certificates</Button>
                    <Button variant="ghost" onClick={() => navigate('/')}>Verify Another</Button>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto mb-4">
                    <GoogleLogo className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">Verification Failed</h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Something went wrong during Google verification. Please try again.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/verify/google')}>Try Again</Button>
                    <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Shell>
  )
}
