import { Chunk } from "@/shared/types/chunking.types.js";
import { GeminiEmbedder } from "./embedder/gemini.embedder.js";
import { EmbeddedChunk } from "@/shared/types/embedding.types.js";

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
