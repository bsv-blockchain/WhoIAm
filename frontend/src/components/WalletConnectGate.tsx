import { useCallback, useEffect, useRef, useState } from 'react'
import { WalletConnectionModal, QRDisplay, useWalletRelayClient } from '@bsv/wallet-relay/react'
import type { WalletClient } from '@bsv/sdk'
import { Loader2, Shield, Smartphone } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RelayWallet } from '@/lib/relayWallet'
import { setRelayWallet } from '@/lib/wallet'
import { useWalletStore } from '@/stores/wallet'
import { useVerificationStore } from '@/stores/verification'

const RELAY_API_URL = import.meta.env.VITE_API_URL ?? '/api'
const INSTALL_URL = import.meta.env.VITE_WALLET_INSTALL_URL ?? 'https://desktop.bsvb.tech'

/**
 * Wallet connection gate, mounted once for the whole app.
 *
 * On load it first tries to resume a mobile wallet paired earlier in this tab
 * — the OAuth verification flows leave the page entirely and come back, which
 * wipes all in-memory state, so without this the paired phone would be lost
 * every time the user returned from Google or X. The relay client persists the
 * session to sessionStorage, so resuming re-attaches to the same phone.
 *
 * Only when there is nothing to resume does it probe for a local BRC-100
 * substrate and, failing that, offer QR pairing. Whichever wallet wins is
 * installed app-wide (see `lib/wallet.ts`), so every call site is unchanged.
 */
export function WalletConnectGate() {
  const { mode, setLocal, setMobile, setNone, setBootstrapped } = useWalletStore()
  const setWalletConnected = useVerificationStore((s) => s.setWalletConnected)
  const [showQR, setShowQR] = useState(false)

  // `autoCreate`/`autoResume` are deliberately left off: the hook's own
  // auto-start effect tears the session down on unmount, which under
  // StrictMode's double-mount would kill a freshly resumed session.
  const { session, error, createSession, resumeSession, wallet } = useWalletRelayClient({
    apiUrl: RELAY_API_URL,
    autoCreate: false,
  })

  // 'resuming' suppresses local-substrate detection until we know whether a
  // paired phone is coming back, so the connect modal never flashes on top of
  // an already-connected session.
  const [phase, setPhase] = useState<'resuming' | 'detect'>('resuming')

  const resumedRef = useRef(false)
  useEffect(() => {
    if (resumedRef.current) return
    resumedRef.current = true
    void resumeSession()
      .then((resumed) => {
        // Nothing to resume: release the app immediately. A resumed session
        // holds the gate closed until the wallet is actually installed below,
        // so pages never run against a half-restored connection.
        if (resumed?.status !== 'connected') {
          setPhase('detect')
          setBootstrapped()
        }
      })
      .catch(() => {
        setPhase('detect')
        setBootstrapped()
      })
  }, [resumeSession, setBootstrapped])

  // Hand the paired phone to the rest of the app as the active wallet. Runs
  // both for a fresh pairing and for a session resumed after a page load.
  const installedRef = useRef(false)
  useEffect(() => {
    if (installedRef.current) return
    if (session?.status !== 'connected' || !wallet) return
    installedRef.current = true

    const relayWallet = new RelayWallet(wallet)
    setRelayWallet(relayWallet)
    void relayWallet
      .getPublicKey({ identityKey: true })
      .then(({ publicKey }) => {
        setMobile(publicKey)
        setWalletConnected(true)
        setShowQR(false)
      })
      .catch(() => {
        // The session looked alive but the phone did not answer — drop back to
        // the normal connect flow rather than leaving a dead wallet installed.
        installedRef.current = false
        setRelayWallet(null)
        setPhase('detect')
      })
      .finally(setBootstrapped)
  }, [session?.status, wallet, setMobile, setWalletConnected, setBootstrapped])

  const handleLocalWallet = useCallback(
    (localWallet: WalletClient) => {
      setRelayWallet(null)
      void localWallet
        .getPublicKey({ identityKey: true })
        .then(({ publicKey }) => setLocal(publicKey))
        .catch(() => setLocal(null))
      setWalletConnected(true)
    },
    [setLocal, setWalletConnected],
  )

  const handleNoWallet = useCallback(() => {
    setNone()
    setWalletConnected(false)
  }, [setNone, setWalletConnected])

  const handleOpenQR = useCallback(() => {
    setShowQR(true)
    if (session?.status !== 'pending') void createSession()
  }, [createSession, session?.status])

  const showDetection = phase === 'detect' && mode !== 'mobile'

  return (
    <>
      {/* The relay lib's modal does the substrate probe: it renders nothing
          while probing or when a local wallet is found. Our chooser UI goes in
          its `children` slot, so mounting means "no local wallet". */}
      {showDetection && (
        <WalletConnectionModal onLocalWallet={handleLocalWallet} onMobileQR={handleOpenQR}>
          <WalletChooser
            open={!showQR}
            onDetectedNoWallet={handleNoWallet}
            onMobileQR={handleOpenQR}
            onDismiss={handleNoWallet}
          />
        </WalletConnectionModal>
      )}

      {showQR && (
        <MobilePairingDialog
          session={session}
          error={error}
          onRefresh={createSession}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  )
}

interface ChooserProps {
  open: boolean
  onDetectedNoWallet: () => void
  onMobileQR: () => void
  onDismiss: () => void
}

function WalletChooser({ open, onDetectedNoWallet, onMobileQR, onDismiss }: ChooserProps) {
  useEffect(() => {
    onDetectedNoWallet()
  }, [onDetectedNoWallet])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onDismiss() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Connect a BRC-100 Wallet</DialogTitle>
          <DialogDescription className="text-center">
            Who I Am needs a BRC-100 wallet to hold your certificates. Install one
            on this device, or pair the wallet on your phone by scanning a QR code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild>
            <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
              Install a Wallet
            </a>
          </Button>
          <Button variant="outline" onClick={onMobileQR}>
            <Smartphone className="mr-2 h-4 w-4" />
            Use my mobile wallet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PairingProps {
  session: Parameters<typeof QRDisplay>[0]['session']
  error: string | null
  onRefresh: () => void
  onClose: () => void
}

function MobilePairingDialog({ session, error, onRefresh, onClose }: PairingProps) {
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Scan with your mobile wallet</DialogTitle>
          <DialogDescription className="text-center">
            Open your BSV mobile wallet, scan this code, and approve the connection.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4 pb-2">
          <QRDisplay
            session={session}
            onRefresh={onRefresh}
            className="flex flex-col items-center gap-3"
            loadingProps={{ className: 'h-56 w-56 animate-pulse rounded-xl bg-surface' }}
            qrProps={{
              className: 'h-56 w-56 overflow-hidden rounded-xl border border-border shadow-sm',
              imageProps: { className: 'h-full w-full', alt: 'Scan to connect your mobile wallet' },
            }}
            statusProps={{ className: 'text-xs font-medium text-text-secondary uppercase tracking-wide' }}
            refreshButtonProps={{ className: 'text-sm font-medium text-primary hover:underline' }}
          />
          {session?.status === 'pending' && (
            <p className="flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for your phone…
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
