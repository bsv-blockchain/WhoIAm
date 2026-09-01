import { WalletClient, AuthFetch, IdentityClient } from '@bsv/sdk'
import type { WalletInterface } from '@bsv/sdk'

let localClient: WalletClient | null = null

/**
 * Set when the user pairs a mobile wallet over the QR relay. While set, every
 * consumer of `getWalletClient()` talks to the phone instead of a local
 * BRC-100 substrate — see `lib/relayWallet.ts`.
 */
let relayWallet: WalletInterface | null = null

export function getWalletClient(): WalletInterface {
  if (relayWallet) return relayWallet
  if (!localClient) {
    localClient = new WalletClient()
  }
  return localClient
}

/** Install (or clear, with `null`) the QR-paired mobile wallet. */
export function setRelayWallet(wallet: WalletInterface | null): void {
  relayWallet = wallet
}

export function isMobileWallet(): boolean {
  return relayWallet !== null
}

export function getAuthFetch(): AuthFetch {
  return new AuthFetch(getWalletClient())
}

export function getIdentityClient(): IdentityClient {
  return new IdentityClient(getWalletClient())
}
