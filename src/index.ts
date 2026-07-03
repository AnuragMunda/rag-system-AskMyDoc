import { logger } from "@/shared/logger/logger.js";
import { startServer } from "@/app/server.js";

logger.info("Ask My Docs booting...");

try {
  startServer();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown error";
  logger.fatal({ error: message }, "Failed to start server");
  process.exit(1);
}
