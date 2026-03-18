export const CERTIFICATE_TYPES = {
  google: 'Kz3dpnvTRO+LzCF+X4zI1GQqRhVmgLGPWZQqG+vhVig=',
  phone: 'mffUklUzxbHr65xLohn0hRL0Tq2GjW1GYF/OPfzqJ6A=',
  x: 'vdDWvftf1H+5+ZprUw123kjHlywH+v20aPQTuXgMpNc=',
} as const

export type CertType = keyof typeof CERTIFICATE_TYPES

export function getCertifierConfig() {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.ngrok.app') || hostname.endsWith('.ngrok.io')) {
    return {
      certifierUrl: window.location.origin,
      certifierPublicKey: '02e7eeb3986273db6843b790a1595ed0ff1b2ae8f43ae2e7f1a0c9db4dd3fb9441',
    }
  }

  return {
    certifierUrl: import.meta.env.VITE_CERTIFIER_URL || 'https://api.whoiam.bsvb.tech',
    certifierPublicKey: '03285263f06139b66fb27f51cf8a92e9dd007c4c4b83876ad6c3e7028db450a4c2',
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
