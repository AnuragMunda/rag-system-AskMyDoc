import { Chunk } from "@/shared/types/chunking.types.js";
import { GeminiEmbedder } from "./embedder/gemini.embedder.js";
import { EmbeddedChunk } from "@/shared/types/embedding.types.js";
import { gemini } from "@/config/constants.js";
import { logger } from "@/shared/logger/logger.js";

export class EmbeddingService {
  private readonly embedder = new GeminiEmbedder(gemini);

  async embedChunk(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
    try {
      logger.info("Embedding chunks");
      const vectors = await this.embedder.embedBatch(
        chunks.map((chunk) => chunk.content),
      );
      logger.info({ TotalEmbeddings: vectors.length }, "Embedding successful");
      logger.info(
        "\n<--------------------------------------------------------->\n",
      );

      return chunks.map((chunk, index) => ({
        chunk,
        embedding: vectors[index]!,
      }));
    } catch (error) {
      throw new Error(
        `Error while embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
