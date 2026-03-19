import express, { Request, Response, NextFunction } from "express";
import { WalletInterface } from "@bsv/sdk";
import { createAuthMiddleware } from "@bsv/auth-express-middleware";
import { config } from "./config";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { httpRequestDuration, httpRequestsTotal } from "./routes/metrics";
import {
  healthRouter,
  metricsRouter,
  manifestRouter,
  emailVerificationRouter,
  phoneVerificationRouter,
  xVerificationRouter,
  googleVerificationRouter,
  signCertificateRouter,
} from "./routes";
import { handleCallback } from "./services/twitter";
import { handleGoogleCallback } from "./services/google";
import { writeVerifiedAttributes } from "./services/redis";
import { logger } from "./utils/logger";

export function createApp(wallet: WalletInterface) {
  const app = express();

  // ─── Global middleware ──────────────────────────────────────────────────

  // Body parsing
  app.use(express.json({ limit: "10mb" }));

  // Request ID
  app.use(requestIdMiddleware);

  // CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      config.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173",
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Headers", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Expose-Headers",
      [
        "X-Request-ID",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "x-bsv-auth-version",
        "x-bsv-auth-message-type",
        "x-bsv-auth-identity-key",
        "x-bsv-auth-nonce",
        "x-bsv-auth-your-nonce",
        "x-bsv-auth-signature",
        "x-bsv-auth-request-id",
        "x-bsv-auth-requested-certificates",
        "x-bsv-payment-version",
        "x-bsv-payment-satoshis-required",
        "x-bsv-payment-derivation-prefix",
      ].join(", "),
    );
    res.header("Access-Control-Allow-Private-Network", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Request metrics (for Prometheus)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      const method = req.method;
      const statusCode = res.statusCode.toString();

      httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        duration,
      );
      httpRequestsTotal.inc({ method, route, status_code: statusCode });
    });
    next();
  });

  // ─── Public routes (no auth required) ──────────────────────────────────

  const publicRouter = express.Router();

  // OAuth callbacks — browser redirects from providers, no BSV auth.
  publicRouter.get("/api/verify/x/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query as { code: string; state: string };

      if (!code || !state) {
        res.redirect(`${config.FRONTEND_URL}/verify/x?error=missing_params`);
        return;
      }

      const result = await handleCallback(code, state);

      await writeVerifiedAttributes(result.identityKey, 'x', {
        userName: result.userName,
        profilePhoto: result.profilePhoto,
      });

      logger.info(
        { identityKey: result.identityKey, userName: result.userName },
        "X callback successful",
      );

      const params = new URLSearchParams({
        success: "true",
        userName: result.userName,
        profilePhoto: result.profilePhoto,
      });
      res.redirect(
        `${config.FRONTEND_URL}/verify/x/callback?${params.toString()}`,
      );
    } catch (err: any) {
      logger.error({ err }, "X OAuth callback failed");
      res.redirect(`${config.FRONTEND_URL}/verify/x?error=auth_failed`);
    }
  });

  publicRouter.get("/api/verify/google/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query as { code: string; state: string };

      if (!code || !state) {
        res.redirect(`${config.FRONTEND_URL}/verify/google?error=missing_params`);
        return;
      }

      const result = await handleGoogleCallback(code, state);

      await writeVerifiedAttributes(result.identityKey, 'google', {
        email: result.email,
        name: result.name,
        profilePhoto: result.profilePhoto,
      });

      logger.info(
        { identityKey: result.identityKey, email: result.email },
        "Google callback successful",
      );

      const params = new URLSearchParams({
        success: "true",
        email: result.email,
        name: result.name,
        profilePhoto: result.profilePhoto,
      });
      res.redirect(
        `${config.FRONTEND_URL}/verify/google/callback?${params.toString()}`,
      );
    } catch (err: any) {
      logger.error({ err }, "Google OAuth callback failed");
      res.redirect(`${config.FRONTEND_URL}/verify/google?error=auth_failed`);
    }
  });

  app.use(publicRouter);
  app.use(healthRouter);
  app.use(metricsRouter);
  app.use(manifestRouter);

  // ─── BSV Auth middleware ───────────────────────────────────────────────

  app.use(
    createAuthMiddleware({
      wallet,
      logger: {
        log: (msg: string) => logger.debug(msg),
        error: (msg: string) => logger.error(msg),
        warn: (msg: string) => logger.warn(msg),
        info: (msg: string) => logger.info(msg),
        debug: (msg: string) => logger.debug(msg),
      } as any,
      logLevel: config.NODE_ENV === "development" ? "debug" : "info",
    }),
  );

  // ─── Authenticated routes ─────────────────────────────────────────────

  app.use(emailVerificationRouter);
  app.use(phoneVerificationRouter);
  app.use(xVerificationRouter);
  app.use(googleVerificationRouter);
  app.use(signCertificateRouter);

  // ─── Error handler (must be last) ─────────────────────────────────────

  app.use(errorHandler);

  return app;
}
