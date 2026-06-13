//////////////////// TYPES FOR PARSING ////////////////////

export type SourceType = "pdf" | "markdown" | "web";

export interface ParsedSection {
  pageNumber?: number;
  heading?: string;
  headingPath?: string[];
  headingLevel?: number;
  content: string; // Full page text
  blocks: ContentBlock[];
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

export interface ContentBlock {
  id: string;
  index: number;
  type: "paragraph" | "code" | "list" | "table" | "definition";
  text: string;
}

export interface PdfLine {
  y: number;
  text: string;
}

export interface MarkdownSection {
  heading?: string;
  headingLevel?: number;
  headingPath: string[];
  blocks: ContentBlock[];
}

export interface WebSection {
  heading?: string;
  headingLevel?: number;
  headingPath: string[];
  blocks: ContentBlock[];
}