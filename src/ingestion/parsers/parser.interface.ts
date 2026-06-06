import { ParsedDocument } from "../types.js";

export interface DocumentParser {
  parse(source: string): Promise<ParsedDocument>;
}
