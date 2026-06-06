import path from "node:path";

import { MarkdownParser } from "../parsers/markdown.parser.js";
import { DocumentParser } from "../parsers/parser.interface.js";
import { PdfParser } from "../parsers/pdf.parser.js";
import { WebParser } from "../parsers/web.parser.js";
import { SourceType } from "../types.js";

export class ParserFactory {
  static create(sourceType: SourceType): DocumentParser {
    switch (sourceType) {
      case "pdf":
        return new PdfParser();

      case "markdown":
        return new MarkdownParser();

      case "web":
        return new WebParser();

      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  static detectType(source: string): SourceType {
    const ext = path.extname(source).toLowerCase();

    switch (ext) {
      case ".pdf":
        return "pdf";

      case ".md":
      case ".markdown":
        return "markdown";

      default:
        throw new Error(`Unable to determine parser for ${source}`);
    }
  }

  static createFromSource(source: string): DocumentParser {
    const type = this.detectType(source);

    return this.create(type);
  }
}
