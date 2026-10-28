import {
  geminiListEmbeddingModel,
  geminiSingleEmbeddingModel,
} from "@/config/constants.js";
import { logger } from "@/shared/logger/logger.js";
import { GoogleGenAI } from "@google/genai";

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

export class GeminiEmbedder {
  constructor(private readonly client: GoogleGenAI) {}

  // This method produces embedding for a single text input
  async embed(text: string): Promise<number[]> {
    const response = await this.withRetry(
      () =>
        this.client.models.embedContent({
          model: geminiSingleEmbeddingModel,
          contents: text,
        }),
      "single embedding",
    );

    if (!response.embeddings?.length || !response.embeddings[0]?.values) {
      throw new Error("Cannot generate embeddings");
    }

    return response.embeddings[0].values;
  }

  // This method produces a list of embeddings for multiple text inputs.
  // Inputs are split into API-sized batches with retry/backoff on transient failures.
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += BATCH_SIZE) {
      const batch = texts.slice(start, start + BATCH_SIZE);

      if (batch.length === 0) {
        continue;
      }

      const response = await this.withRetry(
        () =>
          this.client.models.embedContent({
            model: geminiListEmbeddingModel,
            contents: batch,
          }),
        `embedding batch starting at ${start}`,
      );

      if (!response.embeddings?.length) {
        throw new Error("Cannot generate embeddings");
      }

      const batchEmbeddings = response.embeddings.map((embedding) => {
        if (!embedding.values) {
          throw new Error("Cannot generate embeddings");
        }
        return embedding.values;
      });

      if (batchEmbeddings.length !== batch.length) {
        throw new Error(
          `Embedding count mismatch: expected ${batch.length}, received ${batchEmbeddings.length}`,
        );
      }

      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === MAX_RETRIES || !this.isRetryable(error)) {
          break;
        }

        const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;

        logger.warn(
          { attempt: attempt + 1, delay, context },
          "Retrying embedding request",
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Embedding request failed: ${context}`);
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    return [
      "429",
      "500",
      "502",
      "503",
      "504",
      "resource_exhausted",
      "unavailable",
      "timeout",
      "rate limit",
      "econnreset",
      "etimedout",
    ].some((fragment) => message.includes(fragment));
  }
}
