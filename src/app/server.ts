import express from "express";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "@/shared/logger/logger.js";
import { env } from "@/config/env.js";
import { ingestFile, ingestUrl } from "@/app/routes/ingestion.routes.js";
import { queryRouter } from "@/app/routes/query.routes.js";
import { collectionsRouter } from "@/app/routes/collections.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates and starts the Express server.
 *
 * - Serves the single-page UI from `src/public` at `/`.
 * - Mounts ingestion and query API routes under `/api/`.
 * - Includes a health-check endpoint for monitoring.
 */
export function startServer(): Server {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────
  app.disable("x-powered-by");
  app.use(express.json());

  // ── Static files (the single-page UI) ──────────────────────────────
  app.use(express.static(path.resolve(__dirname, "..", "public")));

  // ── API routes ─────────────────────────────────────────────────────
  app.use("/api/ingest", ingestFile);
  app.use("/api/ingest", ingestUrl);
  app.use("/api/query", queryRouter);
  app.use("/api/collections", collectionsRouter);

  // ── Health check ───────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Global error handler ───────────────────────────────────────────
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if ((err as { code?: string }).code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Uploaded file is too large" });
        return;
      }

      logger.error({ error: err.message }, "Unhandled server error");
      res.status(500).json({ error: "Internal server error" });
    },
  );

  // ── Start ──────────────────────────────────────────────────────────
  const port = env.PORT;
  const server = app.listen(port, () => {
    logger.info({ port }, "Ask My Docs server listening");
  });

  return server;
}
