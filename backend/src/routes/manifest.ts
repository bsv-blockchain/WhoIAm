import { Router, Request, Response } from "express";
import { PrivateKey } from "@bsv/sdk";
import { config } from "../config";

const router = Router();

const publicKey = PrivateKey.fromHex(config.SERVER_PRIVATE_KEY)
  .toPublicKey()
  .toString();

/**
 * BRC-0068: Publish trust anchor details at /manifest.json
 * Allows users to add this service as a Trust Certifier by entering the domain name.
 *
 * @see https://bsv.brc.dev/peer-to-peer/0068
 */
router.get("/manifest.json", (_req: Request, res: Response) => {
  const iconUrl = `${config.HOSTING_DOMAIN}/whoiam.png`;

  res.json({
    name: "Who I Am",
    babbage: {
      trust: {
        name: "Who I Am",
        note: "Certifies email, phone, and X account ownership",
        icon: iconUrl,
        publicKey,
      },
    },
  });
});

export default router;
