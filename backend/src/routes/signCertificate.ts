import { Router, Request, Response } from "express";
import { Certificate, MasterCertificate, Utils, createNonce } from "@bsv/sdk";
import { certificateTypes } from "../certifier";
import { findVerification } from "../services/redis";
import { logger } from "../utils/logger";
import { getWallet } from "../services/wallet";

const router = Router();

/**
 * Sign a certificate after the user has verified their identity.
 * This is called by the BSV SDK's acquireCertificate flow.
 */
router.post("/api/signCertificate", async (req: Request, res: Response) => {
  try {
    const { clientNonce, type, fields, masterKeyring } = req.body;
    const identityKey = req.auth?.identityKey;

    // Validate required arguments
    if (!identityKey) {
      res
        .status(401)
        .json({ status: "error", message: "Authentication required" });
      return;
    }
    if (!clientNonce) {
      res
        .status(400)
        .json({ status: "error", message: "Missing client nonce!" });
      return;
    }
    if (!type) {
      res
        .status(400)
        .json({ status: "error", message: "Missing certificate type!" });
      return;
    }
    if (!fields) {
      res.status(400).json({
        status: "error",
        message: "Missing certificate fields to sign!",
      });
      return;
    }
    if (!masterKeyring) {
      res.status(400).json({
        status: "error",
        message: "Missing masterKeyring to decrypt fields!",
      });
      return;
    }

    // Verify the certificate type is supported
    const certType = certificateTypes[type];
    if (!certType) {
      res.status(400).json({
        status: "error",
        message: `Unsupported certificate type: ${type}`,
      });
      return;
    }

    const wallet = await getWallet();

    // Log debug info to help diagnose decryption issues
    const { publicKey: walletIdentityKey } = await wallet.getPublicKey({
      identityKey: true,
    });
    logger.debug(
      {
        walletIdentityKey,
        identityKey,
        fieldKeys: Object.keys(fields),
        masterKeyringKeys: Object.keys(masterKeyring),
      },
      "signCertificate: decryption debug",
    );

    // Decrypt fields to validate against our verification records
    let decryptedFields: Record<string, string> = {};
    try {
      decryptedFields = await MasterCertificate.decryptFields(
        wallet,
        masterKeyring,
        fields,
        identityKey,
      );
    } catch (decryptErr: any) {
      logger.error(
        { decryptErr: decryptErr.message, walletIdentityKey, identityKey },
        "decryptFields failed",
      );
      throw decryptErr;
    }

    // Validate the decrypted fields match expected cert type fields
    const expectedFields = certType.fields;
    const actualFields = Object.keys(decryptedFields);
    for (const field of expectedFields) {
      if (!actualFields.includes(field)) {
        res.status(400).json({
          status: "error",
          message: `Missing required field: ${field}`,
        });
        return;
      }
    }

    // Check that a matching verification exists in Redis
    const verified = await findVerification(identityKey, certType.verificationType, decryptedFields);
    if (!verified) {
      res.status(400).json({
        status: "error",
        message:
          "No matching verification found. Please verify your identity first.",
      });
      return;
    }

    // Create server nonce and compute serial number (base64 encoding matches SDK expectation)
    const serverNonce = await createNonce(wallet, identityKey);
    const { hmac } = await wallet.createHmac({
      data: Utils.toArray(clientNonce + serverNonce, "base64"),
      protocolID: [2, "certificate issuance"],
      keyID: serverNonce + clientNonce,
      counterparty: identityKey,
    });
    const serialNumber = Utils.toBase64(hmac);

    // Sign the certificate with the encrypted fields (as submitted by client)
    // revocationOutpoint must be non-empty (SDK checks truthiness); use a zeroed placeholder when no on-chain revocation tx is created
    const revocationOutpoint =
      "0000000000000000000000000000000000000000000000000000000000000000.0";
    const certificate = new Certificate(
      type,
      serialNumber,
      identityKey,
      walletIdentityKey,
      revocationOutpoint,
      fields,
    );
    await certificate.sign(wallet);

    logger.info(
      { identityKey, type, serialNumber },
      "Certificate signed and issued",
    );

    res.json({ certificate, serverNonce });
  } catch (err: any) {
    logger.error({ err }, "Certificate signing failed");
    res.status(500).json({
      status: "error",
      message: err.message || "Certificate signing failed",
      requestId: req.requestId,
    });
  }
});

export default router;
