import { ParsedDocument } from "@/shared/types/ingestion.types.js";
import { ParserFactory } from "./factory/parser.factory.js";

export const ingest = async (source: string): Promise<ParsedDocument> => {
  const parser = ParserFactory.createFromSource(source);

  return parser.parse(source);
};
