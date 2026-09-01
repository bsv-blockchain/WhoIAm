import { useWalletStore } from '@/stores/wallet'

/**
 * Read-only view of the wallet connection. The connection itself is driven by
 * `WalletConnectGate`, which detects a local substrate and — when none is
 * found — offers QR pairing with a mobile wallet.
 */
export function useWallet() {
  const { mode, identityKey } = useWalletStore()

  return {
    identityKey,
    isWalletConnected: mode === 'local' || mode === 'mobile',
    isChecking: mode === 'detecting',
    isMobileWallet: mode === 'mobile',
    mode,
  }
}
