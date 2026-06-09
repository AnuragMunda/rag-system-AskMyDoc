//////////////////// TYPES FOR PARSING ////////////////////

export type SourceType = "pdf" | "markdown" | "web";

export interface ParsedSection {
  pageNumber?: number;
  heading?: string;
  headingLevel?: number;
  content: string; // Full page text
  paragraphs: Paragraph[]; // Individual paragraphs
}

export interface ParsedDocument {
  id: string;
  title: string;
  sourceType: SourceType;
  source: string; // file path or URL
  sections: ParsedSection[];
  metadata: {
    pageCount?: number;
    parsedAt: string; // ISO timestamp
  };
}

export interface Paragraph {
  id: string;
  index: number;
  text: string;
}

export interface PdfLine {
  y: number;
  text: string;
}

export interface MarkdownSection {
  heading?: string;
  headingLevel?: number;
  paragraphs: string[];
}

export interface WebSection {
  heading?: string;
  paragraphs: string[];
}

//////////////////// TYPES FOR CHUNKING ////////////////////

export interface Chunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: {
    pageNumber?: number;
    heading?: string;
    paragraphIds: string[];
  };
}

export interface ChunkerOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

export interface ChunkMetadata {
  heading?: string;
  pageNumber?: number;
}

export interface Overlap {
  overlapParagraphs: string[];
  overlapIds: string[];
}

export interface ParagraphRef {
  text: string;
  paragraphId: string;
  pageNumber?: number;
  heading?: string;
}
