import { MasterCertificate } from '@bsv/sdk'
import type {
  CertificateResult,
  GetNetworkResult,
  GetVersionResult,
  ProveCertificateArgs,
  ProveCertificateResult,
  WalletInterface,
} from '@bsv/sdk'
import type { WalletMethodName } from '@bsv/wallet-relay/client'

/** The subset of the wallet interface a paired mobile wallet can serve. */
export type RelayWalletProxy = Pick<WalletInterface, WalletMethodName>

const NETWORK: GetNetworkResult['network'] =
  (import.meta.env.VITE_BSV_NETWORK as GetNetworkResult['network']) ?? 'mainnet'

function unsupported(method: string): never {
  throw new Error(
    `"${method}" is not available on a mobile wallet paired over the relay. ` +
      `Use a local BRC-100 wallet for this action.`,
  )
}

/**
 * Adapts the relay's RPC proxy to the full `WalletInterface` so `AuthFetch`,
 * `IdentityClient`, and the rest of the app can use a QR-paired mobile wallet
 * with no branching at the call sites.
 *
 * Three groups of methods:
 *   - relayed  — forwarded over the WebSocket relay to the phone
 *   - local    — answered here (no round trip needed)
 *   - missing  — not in the mobile method set; throw a clear error
 */
export class RelayWallet implements WalletInterface {
  constructor(private readonly relay: RelayWalletProxy) {}

  // ─── Relayed to the mobile wallet ────────────────────────────────────────

  getPublicKey: WalletInterface['getPublicKey'] = (...a) => this.relay.getPublicKey(...a)
  revealCounterpartyKeyLinkage: WalletInterface['revealCounterpartyKeyLinkage'] = (...a) =>
    this.relay.revealCounterpartyKeyLinkage(...a)
  encrypt: WalletInterface['encrypt'] = (...a) => this.relay.encrypt(...a)
  decrypt: WalletInterface['decrypt'] = (...a) => this.relay.decrypt(...a)
  createHmac: WalletInterface['createHmac'] = (...a) => this.relay.createHmac(...a)
  verifyHmac: WalletInterface['verifyHmac'] = (...a) => this.relay.verifyHmac(...a)
  createSignature: WalletInterface['createSignature'] = (...a) => this.relay.createSignature(...a)
  verifySignature: WalletInterface['verifySignature'] = (...a) => this.relay.verifySignature(...a)
  createAction: WalletInterface['createAction'] = (...a) => this.relay.createAction(...a)
  signAction: WalletInterface['signAction'] = (...a) => this.relay.signAction(...a)
  listActions: WalletInterface['listActions'] = (...a) => this.relay.listActions(...a)
  internalizeAction: WalletInterface['internalizeAction'] = (...a) => this.relay.internalizeAction(...a)
  listOutputs: WalletInterface['listOutputs'] = (...a) => this.relay.listOutputs(...a)
  acquireCertificate: WalletInterface['acquireCertificate'] = (...a) => this.relay.acquireCertificate(...a)
  listCertificates: WalletInterface['listCertificates'] = (...a) => this.relay.listCertificates(...a)
  relinquishCertificate: WalletInterface['relinquishCertificate'] = (...a) =>
    this.relay.relinquishCertificate(...a)

  // ─── Answered locally ────────────────────────────────────────────────────

  async isAuthenticated(): Promise<{ authenticated: true }> {
    return { authenticated: true }
  }

  async waitForAuthentication(): Promise<{ authenticated: true }> {
    return { authenticated: true }
  }

  async getNetwork(): Promise<GetNetworkResult> {
    return { network: NETWORK }
  }

  async getVersion(): Promise<GetVersionResult> {
    return { version: 'wallet-relay-1.0.0' }
  }

  /**
   * Emulated client-side: the mobile method set has no `proveCertificate`.
   * The revelation keyring is derived from the certificate's master keyring
   * (returned by `listCertificates`) using the phone's `encrypt`/`decrypt` —
   * both of which the relay does serve.
   */
  async proveCertificate(args: ProveCertificateArgs): Promise<ProveCertificateResult> {
    const cert = args.certificate as CertificateResult
    if (!cert.keyring) {
      unsupported('proveCertificate (certificate has no master keyring)')
    }
    if (!cert.fields || !cert.certifier || !cert.serialNumber) {
      unsupported('proveCertificate (incomplete certificate)')
    }
    const keyringForVerifier = await MasterCertificate.createKeyringForVerifier(
      this as unknown as Parameters<typeof MasterCertificate.createKeyringForVerifier>[0],
      cert.certifier,
      args.verifier,
      cert.fields,
      args.fieldsToReveal,
      cert.keyring,
      cert.serialNumber,
      args.privileged,
      args.privilegedReason,
    )
    return { keyringForVerifier, certificate: cert, verifier: args.verifier }
  }

  // ─── Not served by the mobile method set ─────────────────────────────────

  revealSpecificKeyLinkage: WalletInterface['revealSpecificKeyLinkage'] = () =>
    unsupported('revealSpecificKeyLinkage')
  abortAction: WalletInterface['abortAction'] = () => unsupported('abortAction')
  relinquishOutput: WalletInterface['relinquishOutput'] = () => unsupported('relinquishOutput')
  discoverByIdentityKey: WalletInterface['discoverByIdentityKey'] = () =>
    unsupported('discoverByIdentityKey')
  discoverByAttributes: WalletInterface['discoverByAttributes'] = () =>
    unsupported('discoverByAttributes')
  getHeight: WalletInterface['getHeight'] = () => unsupported('getHeight')
  getHeaderForHeight: WalletInterface['getHeaderForHeight'] = () => unsupported('getHeaderForHeight')
}
