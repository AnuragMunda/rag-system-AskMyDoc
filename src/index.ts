import { logger } from "@/shared/logger/logger.js";
import { startServer } from "@/app/server.js";

logger.info("Ask My Docs booting...");

try {
  const server = startServer();

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ signal }, "Shutting down...");

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, 10_000);

    forceExit.unref();

    server.close((error) => {
      if (error) {
        logger.error({ error: error.message }, "Failed to close server");
        process.exit(1);
      }

      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown error";
  logger.fatal({ error: message }, "Failed to start server");
  process.exit(1);
}
