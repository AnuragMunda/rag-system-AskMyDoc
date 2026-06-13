import { Chunk } from "@/shared/types/chunking.types.js";

export interface EmbeddedChunk {
  chunk: Chunk;
  embedding: number[];
}
