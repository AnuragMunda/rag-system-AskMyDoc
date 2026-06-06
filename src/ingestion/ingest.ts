import { ParserFactory } from "./factory/parser.factory.js";
import { ParsedDocument } from "./types.js";

export const ingest = async (source: string): Promise<ParsedDocument> => {
  const parser = ParserFactory.createFromSource(source);

  return parser.parse(source);
};
