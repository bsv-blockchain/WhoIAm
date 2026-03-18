import { CertificateTypeDefinition } from '../types'

export const phoneCertificate: CertificateTypeDefinition = {
  name: 'Phone Certificate',
  verificationType: 'phone',
  fields: ['phoneNumber'],
  definition: {
    phoneNumber: '',
  },
}

export const PHONE_CERT_TYPE = 'mffUklUzxbHr65xLohn0hRL0Tq2GjW1GYF/OPfzqJ6A='
