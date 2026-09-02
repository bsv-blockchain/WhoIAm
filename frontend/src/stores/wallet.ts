import { create } from 'zustand'

/**
 * How the app is talking to a BRC-100 wallet.
 *   detecting — probing for a local substrate on load
 *   local     — a local BRC-100 wallet (extension / desktop app) is authenticated
 *   mobile    — a phone paired over the QR relay (@bsv/wallet-relay)
 *   none      — nothing available; the connection modal is showing
 */
export type WalletMode = 'detecting' | 'local' | 'mobile' | 'none'

interface WalletState {
  mode: WalletMode
  identityKey: string | null
  /**
   * True once the gate has finished deciding which wallet (if any) is active.
   * Pages must not touch `getWalletClient()` before this flips, or a mobile
   * wallet still being resumed will be missed and a local WalletClient used
   * in its place — see `WalletConnectGate`.
   */
  isBootstrapped: boolean
  setBootstrapped: () => void
  setDetecting: () => void
  setLocal: (identityKey: string | null) => void
  setMobile: (identityKey: string | null) => void
  setNone: () => void
}

export const useWalletStore = create<WalletState>((set) => ({
  mode: 'detecting',
  identityKey: null,
  isBootstrapped: false,
  setBootstrapped: () => set({ isBootstrapped: true }),
  setDetecting: () => set({ mode: 'detecting', identityKey: null }),
  setLocal: (identityKey) => set({ mode: 'local', identityKey }),
  setMobile: (identityKey) => set({ mode: 'mobile', identityKey }),
  setNone: () => set({ mode: 'none', identityKey: null }),
}))
