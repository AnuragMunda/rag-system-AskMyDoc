export type SourceType = "pdf" | "markdown" | "web";

export interface ParsedSection {
  pageNumber: number;
  heading?: string;
  content: string; // Full page text
  paragraphs: Paragraph[]; // Individual paragraphs
}

export interface ParsedDocument {
  id: string;
  title: string;
  sourceType: SourceType;
  source: string; // file path or URL
  sections: ParsedSection[];
  metadata?: Record<string, unknown>;
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
