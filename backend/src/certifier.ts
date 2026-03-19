import { CertificateTypeDefinition } from "./types";
import { emailCertificate, EMAIL_CERT_TYPE } from "./certificates/emailcert";
import { phoneCertificate, PHONE_CERT_TYPE } from "./certificates/phonecert";
import { xCertificate, X_CERT_TYPE } from "./certificates/xcert";
import { googleCertificate, GOOGLE_CERT_TYPE } from "./certificates/googlecert";

/**
 * Registry of all certificate types this certifier can issue.
 * Keyed by the base64-encoded certificate type identifier.
 */
export const certificateTypes: Record<string, CertificateTypeDefinition> = {
  [EMAIL_CERT_TYPE]: emailCertificate,
  [PHONE_CERT_TYPE]: phoneCertificate,
  [X_CERT_TYPE]: xCertificate,
  [GOOGLE_CERT_TYPE]: googleCertificate,
};
