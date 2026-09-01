import type http from "node:http";
import express, { Request, Response, Router } from "express";
import { PrivateKey, ProtoWallet } from "@bsv/sdk";
import { WalletRelayService } from "@bsv/wallet-relay";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * Router for the mobile wallet relay REST API.
 *
 * Exported separately from `initWalletRelay` because of an ordering
 * constraint: the routes must be mounted on the Express app *before* the BSV
 * auth middleware (they are public — the mobile is not yet paired), but the
 * `WalletRelayService` needs the `http.Server` instance, which only exists
 * after `createApp()` has returned. So `createApp()` mounts this (initially
 * empty) router early, and `initWalletRelay()` populates it once the server
 * exists. Express resolves routes at request time, so late registration works.
 */
export const walletRelayRouter: Router = express.Router();

let relay: WalletRelayService | null = null;

/** http(s):// URL of this backend as reachable by the mobile device. */
export function relayPublicUrl(): string {
  return config.RELAY_PUBLIC_URL ?? config.HOSTING_DOMAIN;
}

/** ws(s):// URL of this backend's relay socket, handed to the mobile at connect time. */
export function relayWsUrl(): string {
  return config.RELAY_WS_URL ?? relayPublicUrl().replace(/^http/, "ws");
}

function allowedOrigins(): string[] {
  return [
    relayPublicUrl(),
    config.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
  ];
}

/**
 * Attach the wallet relay (WebSocket server at /ws + REST API under /api) to
 * the given HTTP server and register its routes on `walletRelayRouter`.
 *
 * Routes are registered manually rather than by passing `app` to the service:
 * the library's own `GET /api/session` embeds the *browser's* Origin header in
 * the QR code, which in dev is the Vite origin — unreachable from the phone.
 * We always embed `relayPublicUrl()` instead, which the mobile fetches over
 * HTTPS to discover the relay socket (that TLS cert is the trust anchor).
 */
export function initWalletRelay(server: http.Server): WalletRelayService | null {
  if (!config.RELAY_ENABLED) {
    logger.info("Mobile wallet relay disabled (RELAY_ENABLED=false)");
    return null;
  }
  if (relay) return relay;

  const wallet = new ProtoWallet(PrivateKey.fromHex(config.SERVER_PRIVATE_KEY));
  const origin = relayPublicUrl();
  const allowed = new Set(allowedOrigins());

  relay = new WalletRelayService({
    server,
    wallet,
    origin,
    relayUrl: relayWsUrl(),
    allowedOrigins: (o: string) => allowed.has(o),
    schema: config.QR_SCHEMA,
    onSessionConnected: (sessionId) =>
      logger.info({ sessionId }, "Mobile wallet paired"),
    onSessionDisconnected: (sessionId) =>
      logger.info({ sessionId }, "Mobile wallet disconnected"),
  });

  registerRoutes(relay);

  logger.info(
    { origin, relayUrl: relayWsUrl(), schema: config.QR_SCHEMA },
    "Mobile wallet relay attached",
  );
  return relay;
}

export function stopWalletRelay(): void {
  relay?.stop();
  relay = null;
}

function registerRoutes(service: WalletRelayService): void {
  const desktopToken = (req: Request): string | undefined =>
    req.headers["x-desktop-token"] as string | undefined;

  walletRelayRouter.get("/api/session", (_req: Request, res: Response) => {
    void service
      .createSession({ origin: relayPublicUrl() })
      .then((info) => res.json(info))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed";
        logger.error({ err }, "Failed to create relay session");
        res.status((err as { code?: number })?.code === 429 ? 429 : 500).json({ error: msg });
      });
  });

  walletRelayRouter.get("/api/session/:id", (req: Request, res: Response) => {
    const info = service.getSession(req.params.id);
    if (!info) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(info);
  });

  walletRelayRouter.post("/api/request/:id", (req: Request, res: Response) => {
    const { method, params } = req.body as { method?: string; params?: unknown };
    if (!method) {
      res.status(400).json({ error: "method is required" });
      return;
    }
    void service
      .sendRequest(req.params.id, method, params, desktopToken(req))
      .then((response) => res.json(response))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Request failed";
        const status = msg === "Invalid desktop token"
          ? 401
          : msg.startsWith("Session is")
            ? 400
            : 504;
        res.status(status).json({ error: msg });
      });
  });

  walletRelayRouter.delete("/api/session/:id", (req: Request, res: Response) => {
    const token = desktopToken(req);
    if (!token) {
      res.status(401).json({ error: "Missing desktop token" });
      return;
    }
    try {
      service.deleteSession(req.params.id, token);
      res.status(204).end();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      const status = msg === "Invalid desktop token" ? 401 : msg === "Session not found" ? 404 : 500;
      res.status(status).json({ error: msg });
    }
  });
}
