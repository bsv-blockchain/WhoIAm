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
  setDetecting: () => void
  setLocal: (identityKey: string | null) => void
  setMobile: (identityKey: string | null) => void
  setNone: () => void
}

export const useWalletStore = create<WalletState>((set) => ({
  mode: 'detecting',
  identityKey: null,
  setDetecting: () => set({ mode: 'detecting', identityKey: null }),
  setLocal: (identityKey) => set({ mode: 'local', identityKey }),
  setMobile: (identityKey) => set({ mode: 'mobile', identityKey }),
  setNone: () => set({ mode: 'none', identityKey: null }),
}))
