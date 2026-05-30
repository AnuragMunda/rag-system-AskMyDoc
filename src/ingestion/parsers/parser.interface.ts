import { ParsedDocument } from "../types.js";

export interface DocumentParser {
  parse(input: string): Promise<ParsedDocument>;
}
