import http from "node:http";
import { config } from "./config";
import { logger } from "./utils/logger";
import { connectToRedis, closeRedisConnection } from "./services/redis";
import { createApp } from "./server";
import { getWallet } from "./services/wallet";
import { initWalletRelay, stopWalletRelay, relayPublicUrl, relayWsUrl } from "./services/walletRelay";

async function main() {
  logger.info({ env: config.NODE_ENV }, "Starting Who I Am backend...");

  // Connect to infrastructure
  connectToRedis();

  // Initialize BSV wallet (singleton cached in services/wallet.ts)
  logger.info("Initializing BSV wallet...");
  const wallet = await getWallet();
  logger.info("BSV wallet initialized");

  // Create the Express app and wrap it in an explicit HTTP server so the
  // mobile wallet relay can attach its WebSocket upgrade handler (at /ws).
  const app = createApp(wallet);
  const server = http.createServer(app);
  initWalletRelay(server);

  server.listen(config.HTTP_PORT, () => {
    logger.info(
      {
        port: config.HTTP_PORT,
        domain: config.HOSTING_DOMAIN,
        relayEnabled: config.RELAY_ENABLED,
        relayOrigin: config.RELAY_ENABLED ? relayPublicUrl() : undefined,
        relayWs: config.RELAY_ENABLED ? relayWsUrl() : undefined,
      },
      `Who I Am backend listening on port ${config.HTTP_PORT}`,
    );
  });

  // ─── Graceful shutdown ──────────────────────────────────────────────────

  const shutdown = async (signal: string) => {
    logger.info(
      { signal },
      "Received shutdown signal, starting graceful shutdown...",
    );

    // Stop the relay (closes WS server, rejects in-flight mobile requests)
    stopWalletRelay();

    // Stop accepting new connections
    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        await closeRedisConnection();
        logger.info("All connections closed. Exiting.");
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "Error during shutdown");
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle unhandled rejections
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled rejection");
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start Who I Am backend");
  process.exit(1);
});
