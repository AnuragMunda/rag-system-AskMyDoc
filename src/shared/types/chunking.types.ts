//////////////////// TYPES FOR CHUNKING ////////////////////

import { ContentBlock, SourceType } from "./ingestion.types.js";

export interface Chunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: {
    pageNumber?: number;
    headingPath?: string[];
    sourceType: SourceType;
    source: string;
    blockIds: string[];
  };
}

export interface ChunkerOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

export interface ChunkMetadata {
  headingPath?: string[];
  pageNumber?: number;
  sourceType: SourceType;
  source: string;
}

export interface BlockRef {
  blockId: string;
  text: string;
  type: ContentBlock["type"];
  headingPath?: string[];
  pageNumber?: number;
}
