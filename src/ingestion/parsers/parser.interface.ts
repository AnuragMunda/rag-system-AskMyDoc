import { ParsedDocument } from "@/shared/types/ingestion.types.js";

export interface DocumentParser {
  parse(source: string): Promise<ParsedDocument>;
}
