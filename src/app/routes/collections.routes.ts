import { Router } from "express";

import { ChromaStore } from "@/vector-store/chroma.store.js";
import { logger } from "@/shared/logger/logger.js";

const vectorStore = new ChromaStore();

/**
 * GET /api/collections
 *
 * Lists all per-document collections (those whose names start with "doc-").
 * Returns an array of collection metadata objects for the document selector.
 *
 * Response: [{ name, title, sourceType, chunkCount }]
 */
const collectionsRouter: Router = Router();

collectionsRouter.get("/", async (_req, res) => {
  try {
    const collections = await vectorStore.listCollections();

    const docCollections = collections
      .filter((c) => c.name.startsWith("doc-"))
      .map((c) => ({
        name: c.name,
        title: (c.metadata?.["title"] as string) ?? c.name,
        sourceType: (c.metadata?.["sourceType"] as string) ?? "unknown",
        chunkCount: (c.metadata?.["chunkCount"] as number) ?? 0,
      }));

    res.json(docCollections);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "Failed to list collections");
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/collections/:name
 *
 * Deletes a single per-document collection by name.
 *
 * Response: { ok: true }
 */
collectionsRouter.delete("/:name", async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      res.status(400).json({ error: "No collection name provided" });
      return;
    }

    await vectorStore.deleteCollection(name);

    logger.info({ collection: name }, "Collection deleted");
    res.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "Failed to delete collection");
    res.status(500).json({ error: message });
  }
});

export { collectionsRouter };
