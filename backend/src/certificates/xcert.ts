import { CertificateTypeDefinition } from '../types'

export const xCertificate: CertificateTypeDefinition = {
  name: 'X Certificate',
  verificationType: 'x',
  fields: ['userName', 'profilePhoto'],
  definition: {
    userName: '',
    profilePhoto: '',
  },
}

export const X_CERT_TYPE = 'vdDWvftf1H+5+ZprUw123kjHlywH+v20aPQTuXgMpNc='
