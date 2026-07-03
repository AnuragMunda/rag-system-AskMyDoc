import { RetrievedChunk } from "./retrieval.types.js";

/**
 * The full result of a generation pipeline run.
 * Includes the generated answer, structured citations, raw retrieved chunks,
 * and optional debug information for the UI panel.
 */
export interface GeneratedAnswer {
  answer: string;
  citations: Citation[];
  retrievedChunks: RetrievedChunk[];
  debug?: GenerationDebugInfo;
}

/**
 * Metadata about a single inline citation referenced in the answer text.
 */
export interface Citation {
  id: string;
  chunkId: string;
  source: string;
  pageNumber?: number;
  headingPath?: string[];
  blockIds: string[];
}

/**
 * A single context entry built from a retrieved chunk for the LLM prompt.
 */
export interface PromptContext {
  id: string;
  retrievedChunk: RetrievedChunk;
}

/**
 * Debug metrics shown in the UI debug panel.
 */
export interface GenerationDebugInfo {
  /** Total token count used in the full prompt (system + context + query). */
  totalTokens: number;
  /** Number of chunks retrieved from the vector store. */
  retrievedCount: number;
  /** Token count of the serialised context portion of the prompt. */
  contextTokens: number;
}
