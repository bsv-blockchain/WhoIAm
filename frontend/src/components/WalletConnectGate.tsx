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
 * On load it probes for a local BRC-100 substrate. When none is found it shows
 * a modal offering either a wallet install or QR pairing with a mobile wallet
 * over the relay — the paired phone is then installed as the app-wide wallet
 * (see `lib/wallet.ts`), so every existing call site works unchanged.
 */
export function WalletConnectGate() {
  const { mode, setLocal, setMobile, setNone } = useWalletStore()
  const setWalletConnected = useVerificationStore((s) => s.setWalletConnected)
  const [showQR, setShowQR] = useState(false)

  const handleLocalWallet = useCallback(
    (wallet: WalletClient) => {
      setRelayWallet(null)
      void wallet
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

  const handleMobileConnected = useCallback(
    (identityKey: string | null) => {
      setMobile(identityKey)
      setWalletConnected(true)
      setShowQR(false)
    },
    [setMobile, setWalletConnected],
  )

  return (
    <>
      {/* Detection is done by the relay lib's modal: it renders nothing while
          probing or when a local wallet is found. We render our own chooser UI
          through its `children` slot. */}
      {(mode === 'detecting' || mode === 'none') && (
        <WalletConnectionModal onLocalWallet={handleLocalWallet} onMobileQR={() => setShowQR(true)}>
          <WalletChooser
            open={!showQR}
            onDetectedNoWallet={handleNoWallet}
            onMobileQR={() => setShowQR(true)}
            onDismiss={handleNoWallet}
          />
        </WalletConnectionModal>
      )}

      {showQR && (
        <MobilePairingDialog
          apiUrl={RELAY_API_URL}
          onConnected={handleMobileConnected}
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

/**
 * Rendered only once the relay lib has concluded no local wallet is present,
 * so mounting is itself the "no wallet detected" signal.
 */
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
  apiUrl: string
  onConnected: (identityKey: string | null) => void
  onClose: () => void
}

function MobilePairingDialog({ apiUrl, onConnected, onClose }: PairingProps) {
  const { session, error, createSession, cancelSession, wallet } = useWalletRelayClient({
    apiUrl,
    autoCreate: false,
  })

  // React StrictMode mounts effects twice in dev. Creating a session per mount
  // would leave the phone scanning a QR for a session we already replaced, so
  // create exactly once per mount and let the backend GC reclaim it.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void createSession()
  }, [createSession])

  // Hand the paired phone to the rest of the app as the active wallet.
  const installedRef = useRef(false)
  useEffect(() => {
    if (installedRef.current) return
    if (session?.status !== 'connected' || !wallet) return
    installedRef.current = true

    const relayWallet = new RelayWallet(wallet)
    setRelayWallet(relayWallet)
    void relayWallet
      .getPublicKey({ identityKey: true })
      .then(({ publicKey }) => onConnected(publicKey))
      .catch(() => onConnected(null))
  }, [session?.status, wallet, onConnected])

  const handleClose = useCallback(() => {
    if (!installedRef.current) cancelSession()
    onClose()
  }, [cancelSession, onClose])

  return (
    <Dialog open onOpenChange={(next) => { if (!next) handleClose() }}>
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
            onRefresh={createSession}
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
