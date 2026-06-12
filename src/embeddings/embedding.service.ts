import { Chunk } from "@/ingestion/types.js";
import { GeminiEmbedder } from "./gemini.embedder.js";
import { EmbeddedChunk } from "./types.js";

export class EmbeddingService {
  constructor(private readonly embedder: GeminiEmbedder) {}

  async embedChunk(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
    const vectors = await this.embedder.embedBatch(
      chunks.map((chunk) => chunk.content),
    );

    return chunks.map((chunk, index) => ({
      chunk,
      embedding: vectors[index]!,
    }));
  }
}
