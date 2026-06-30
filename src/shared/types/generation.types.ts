import { RetrievedChunk } from "./retrieval.types.js";

export interface GeneratedAnswer {
  answer: string;
  citations: Citation[];
  retrievedChunks: RetrievedChunk[];
}

export interface Citation {
  id: string;
  chunkId: string;
  source: string;
  pageNumber?: number;
  headingPath?: string[];
  blockIds: string[];
}

export interface PromptContext {
  id: string;
  retrievedChunk: RetrievedChunk;
}
