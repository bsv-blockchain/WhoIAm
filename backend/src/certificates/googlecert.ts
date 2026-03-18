import { CertificateTypeDefinition } from '../types'

export const googleCertificate: CertificateTypeDefinition = {
  name: 'Google Certificate',
  verificationType: 'google',
  fields: ['email', 'name', 'profilePhoto'],
  definition: {
    email: '',
    name: '',
    profilePhoto: '',
  },
}

// Deterministic base64 type ID for Google certificates
export const GOOGLE_CERT_TYPE = 'Kz3dpnvTRO+LzCF+X4zI1GQqRhVmgLGPWZQqG+vhVig='
