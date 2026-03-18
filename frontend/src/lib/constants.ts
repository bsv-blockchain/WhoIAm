export const CERTIFICATE_TYPES = {
  google: 'Kz3dpnvTRO+LzCF+X4zI1GQqRhVmgLGPWZQqG+vhVig=',
  phone: 'mffUklUzxbHr65xLohn0hRL0Tq2GjW1GYF/OPfzqJ6A=',
  x: 'vdDWvftf1H+5+ZprUw123kjHlywH+v20aPQTuXgMpNc=',
} as const

export type CertType = keyof typeof CERTIFICATE_TYPES

let cachedCertifierConfig: { certifierUrl: string; certifierPublicKey: string } | null = null

export async function getCertifierConfig() {
  if (cachedCertifierConfig) {
    return cachedCertifierConfig
  }

  const hostname = window.location.hostname
  const certifierUrl = import.meta.env.VITE_CERTIFIER_URL || (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.ngrok.app') || hostname.endsWith('.ngrok.io')
      ? window.location.origin
      : 'https://api.whoiam.bsvb.tech'
  )

  try {
    // Fetch manifest.json to get the actual public key from the backend
    const response = await fetch(`${certifierUrl}/manifest.json`)
    const manifest = await response.json()
    const certifierPublicKey = manifest.babbage?.trust?.publicKey || '03285263f06139b66fb27f51cf8a92e9dd007c4c4b83876ad6c3e7028db450a4c2'

    cachedCertifierConfig = { certifierUrl, certifierPublicKey }
    return cachedCertifierConfig
  } catch {
    // Fallback to default if manifest fetch fails
    cachedCertifierConfig = {
      certifierUrl,
      certifierPublicKey: '03285263f06139b66fb27f51cf8a92e9dd007c4c4b83876ad6c3e7028db450a4c2',
    }
    return cachedCertifierConfig
  }
}

export function getApiBaseUrl(): string {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.ngrok.app') || hostname.endsWith('.ngrok.io')) return window.location.origin
  return 'https://api.whoiam.bsvb.tech'
}

export const CERT_TYPE_LABELS: Record<string, string> = {
  [CERTIFICATE_TYPES.google]: 'Google',
  [CERTIFICATE_TYPES.phone]: 'Phone',
  [CERTIFICATE_TYPES.x]: 'X',
}

export const CERT_TYPE_FIELDS: Record<string, string[]> = {
  [CERTIFICATE_TYPES.google]: ['email', 'name', 'profilePhoto'],
  [CERTIFICATE_TYPES.phone]: ['phoneNumber'],
  [CERTIFICATE_TYPES.x]: ['userName', 'profilePhoto'],
}
