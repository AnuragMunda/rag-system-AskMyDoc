import { SourceType } from "./ingestion.types.js";

export interface RetrievedChunk {
    chunkId: string;
    content: string;
    distance: number;
    source: string;
    sourceType: SourceType;
    pageNumber?: number;
    headingPath?: string[];
    blockIds: string[];
}

export interface RetrievalOptions {
    topK?: number;
}