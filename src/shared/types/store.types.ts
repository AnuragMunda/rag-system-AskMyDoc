import { SourceType } from "@/shared/types/ingestion.types.js";

export interface Document {
  documentId: string;
  chunkIndex: string;
  source: string;
  sourceType: SourceType;
  pageNumber?: number;
  headingPath?: string[];
}
