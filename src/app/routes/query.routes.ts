import { Router } from "express";

import { GeminiEmbedder } from "@/embeddings/embedder/gemini.embedder.js";
import { RetrievalService } from "@/retrieval/retrieval.service.js";
import { PromptBuilder } from "@/llm/prompt-builder.js";
import { AnswerGenerator } from "@/llm/answer-generator.js";
import { GenerationPipeline } from "@/pipelines/generation.pipeline.js";
import { ChromaStore } from "@/vector-store/chroma.store.js";
import { gemini } from "@/config/constants.js";
import { logger } from "@/shared/logger/logger.js";

const embedder = new GeminiEmbedder(gemini);
const vectorStore = new ChromaStore();
const promptBuilder = new PromptBuilder();
const answerGenerator = new AnswerGenerator(gemini);

/**
 * POST /api/query
 *
 * Accepts a natural-language question and a collection name identifying
 * which document to search. Returns a generated answer backed by retrieved
 * chunks, inline citations, and debug metrics.
 *
 * Request:  { "query": "What is AGI?", "collectionName": "doc-<uuid>" }
 * Response: { answer, citations, retrievedChunks, debug }
 */
const queryRouter: Router = Router();
queryRouter.post("/", async (req, res) => {
  try {
    const { query, collectionName } = req.body as {
      query?: string;
      collectionName?: string;
    };

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: "No query provided" });
      return;
    }

    if (!collectionName || collectionName.trim().length === 0) {
      res.status(400).json({ error: "No collection specified. Ingest a document first." });
      return;
    }

    logger.info({ query, collectionName }, "Query received");

    const retrieval = new RetrievalService(embedder, vectorStore, collectionName);
    const pipeline = new GenerationPipeline(retrieval, promptBuilder, answerGenerator);

    const result = await pipeline.generateAnswer(query);

    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during query processing";
    logger.error({ error: message }, "Query failed");
    res.status(500).json({ error: message });
  }
});

export { queryRouter };
