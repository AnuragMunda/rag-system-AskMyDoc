import { Chunk } from "@/ingestion/types.js";

export interface EmbeddedChunk {
  chunk: Chunk;
  embedding: number[];
}
