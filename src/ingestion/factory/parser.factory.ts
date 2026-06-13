import path from "node:path";

import { MarkdownParser } from "../parsers/markdown.parser.js";
import { DocumentParser } from "../parsers/parser.interface.js";
import { PdfParser } from "../parsers/pdf.parser.js";
import { WebParser } from "../parsers/web.parser.js";
import { SourceType } from "@/shared/types/ingestion.types.js";

export class ParserFactory {
  private static parsers = new Map();

  static {
    this.parsers.set("pdf", PdfParser);

    this.parsers.set("markdown", MarkdownParser);

    this.parsers.set("web", WebParser);
  }

  static create(sourceType: SourceType): DocumentParser {
    const Parser = this.parsers.get(sourceType);

    if (!Parser) {
      throw new Error(`Unsupported source type: ${sourceType}`);
    }

    return new Parser();
  }

  static detectType(source: string): SourceType {
    if (source.startsWith("http://") || source.startsWith("https://")) {
      return "web";
    }

    const ext = path.extname(source).toLowerCase();

    switch (ext) {
      case ".pdf":
        return "pdf";

      case ".md":
      case ".markdown":
        return "markdown";

      default:
        throw new Error(`Unsupported source: ${source}`);
    }
  }

  static createFromSource(source: string): DocumentParser {
    const type = this.detectType(source);

    return this.create(type);
  }
}
