import { CertificateTypeDefinition } from '../types'

export const emailCertificate: CertificateTypeDefinition = {
  name: 'Email Certificate',
  verificationType: 'email',
  fields: ['email'],
  definition: {
    email: '',
  },
}

export const EMAIL_CERT_TYPE = 'exOl3KM0dIJ04EW5pZgbZmPag6MdJXd3/a1enmUU/BA='
