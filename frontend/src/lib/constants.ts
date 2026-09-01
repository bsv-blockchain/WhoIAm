export const CERTIFICATE_TYPES = {
  google: 'Kz3dpnvTRO+LzCF+X4zI1GQqRhVmgLGPWZQqG+vhVig=',
  phone: 'mffUklUzxbHr65xLohn0hRL0Tq2GjW1GYF/OPfzqJ6A=',
  x: 'vdDWvftf1H+5+ZprUw123kjHlywH+v20aPQTuXgMpNc=',
} as const

export type CertType = keyof typeof CERTIFICATE_TYPES

let cachedCertifierConfig: {
  frontUrl: string
  apiUrl: string
  certifierPublicKey: string
} | null = null

export async function getCertifierConfig() {
  if (cachedCertifierConfig) {
    return cachedCertifierConfig
  }

  const frontUrl = import.meta.env.VITE_FRONT_URL || globalThis.location.origin
  const apiUrl = import.meta.env.VITE_API_URL || `${globalThis.location.origin}/api`

  try {
    // Fetch manifest.json — registered at /manifest.json (no /api prefix)
    const response = await fetch(`${getApiBaseUrl()}/manifest.json`)
    const manifest = await response.json()
    const certifierPublicKey = manifest.babbage?.trust?.publicKey || '02e7eeb3986273db6843b790a1595ed0ff1b2ae8f43ae2e7f1a0c9db4dd3fb9441'

    cachedCertifierConfig = { frontUrl, apiUrl, certifierPublicKey }
    return cachedCertifierConfig
  } catch {
    // Fallback to defaults if manifest fetch fails
    cachedCertifierConfig = {
      frontUrl,
      apiUrl,
      certifierPublicKey: '02e7eeb3986273db6843b790a1595ed0ff1b2ae8f43ae2e7f1a0c9db4dd3fb9441',
    }
    return cachedCertifierConfig
  }
}

/**
 * Origin that serves the backend API — used as the base for `/api/...` paths
 * and, via AuthFetch, for the BRC-104 `/.well-known/auth` handshake.
 *
 * Derived from VITE_API_URL (minus its `/api` suffix) so requests go straight
 * to the backend. Falls back to this page's origin, which relies on the dev
 * server / nginx proxying `/api` and `/.well-known` through to the backend.
 */
export function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '')
  }
  return globalThis.location.origin
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
