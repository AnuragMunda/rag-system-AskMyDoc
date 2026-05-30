export type SourceType = "pdf" | "markdown" | "web";

export interface ParsedSection {
  content: string;
  heading?: string;
  pageNumber?: number;
}

export interface ParsedDocument {
  id: string;
  title: string;
  sourceType: SourceType;
  source: string; // file path or URL
  sections: ParsedSection[];
  metadata?: Record<string, unknown>;
}
