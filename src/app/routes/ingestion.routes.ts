import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";

import { ingest } from "@/ingestion/ingest.js";
import { Chunker } from "@/chunking/chunker.js";
import { EmbeddingService } from "@/embeddings/embedding.service.js";
import { ChromaStore } from "@/vector-store/chroma.store.js";
import { logger } from "@/shared/logger/logger.js";

/**
 * Multer disk-storage engine that preserves the original file extension.
 * Without this, multer saves files without any extension and the parser
 * factory cannot detect the document type from the path.
 */
const storage = multer.diskStorage({
  destination: path.resolve("storage/documents"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });
const vectorStore = new ChromaStore();

/**
 * POST /api/ingest/file
 *
 * Accepts a PDF or Markdown file upload, saves it to storage/documents/,
 * then runs the full ingestion pipeline (parse → chunk → embed → store).
 * Chunks are stored in a per-document collection named "doc-{uuid}".
 *
 * Request:  multipart/form-data with field "file"
 * Response: { id, title, originalName, sourceType, chunkCount, collectionName }
 */
const ingestFile: Router = Router();
ingestFile.post("/file", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const allowedExtensions = [".pdf", ".md", ".markdown"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      await fs.unlink(file.path).catch(() => {});
      res.status(400).json({
        error: `Unsupported file type "${ext}". Accepted: PDF, Markdown`,
      });
      return;
    }

    logger.info({ originalname: file.originalname }, "File uploaded");

    const parsed = await ingest(file.path);
    parsed.title = path.basename(file.originalname, path.extname(file.originalname));
    const collectionName = `doc-${parsed.id}`;

    const chunker = new Chunker();
    const embeddingService = new EmbeddingService();

    const chunks = await chunker.chunkDocument(parsed);
    const embedded = await embeddingService.embedChunk(chunks);
    await vectorStore.store(collectionName, embedded, {
      title: parsed.title,
      sourceType: parsed.sourceType,
      chunkCount: chunks.length,
    });

    res.json({
      id: parsed.id,
      title: parsed.title,
      originalName: file.originalname,
      sourceType: parsed.sourceType,
      chunkCount: chunks.length,
      collectionName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during ingestion";
    logger.error({ error: message }, "File ingestion failed");
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/ingest/url
 *
 * Accepts a URL pointing to a web page or documentation, fetches it,
 * then runs the full ingestion pipeline (parse → chunk → embed → store).
 * Chunks are stored in a per-document collection named "doc-{uuid}".
 *
 * Request:  { "url": "https://..." }
 * Response: { id, title, originalName, sourceType, chunkCount, collectionName }
 */
const ingestUrl: Router = Router();
ingestUrl.post("/url", async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json({ error: "No URL provided" });
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      res.status(400).json({ error: "Invalid URL format" });
      return;
    }

    logger.info({ url }, "URL ingestion requested");

    const parsed = await ingest(url);
    const collectionName = `doc-${parsed.id}`;

    const chunker = new Chunker();
    const embeddingService = new EmbeddingService();

    const chunks = await chunker.chunkDocument(parsed);
    const embedded = await embeddingService.embedChunk(chunks);
    await vectorStore.store(collectionName, embedded, {
      title: parsed.title,
      sourceType: parsed.sourceType,
      chunkCount: chunks.length,
    });

    res.json({
      id: parsed.id,
      title: parsed.title,
      originalName: url,
      sourceType: parsed.sourceType,
      chunkCount: chunks.length,
      collectionName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during ingestion";
    logger.error({ error: message }, "URL ingestion failed");
    res.status(500).json({ error: message });
  }
});

export { ingestFile, ingestUrl };
