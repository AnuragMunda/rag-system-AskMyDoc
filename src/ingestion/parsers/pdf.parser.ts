import { DocumentParser } from "./parser.interface.js";
import { ParsedDocument, SourceType } from "../types.js";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs/promises";

export class PdfParser implements DocumentParser {
  async parse(filePath: string): Promise<ParsedDocument> {
    try {
      // Step 1: validate the file
      await this.validateFile(filePath);

      // Step 2: read binary
      const pdfBuffer = await this.readPdf(filePath);

      console.log("PDF loaded successfully");
      console.log(`Size: ${pdfBuffer.length} bytes`);

      // Return unified format
      return {
        id: uuidv4(),
        title: path.basename(filePath),
        sourceType: "pdf" as SourceType,
        source: filePath,
        sections: [],
        metadata: {},
      };
    } catch (error) {
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async validateFile(filePath: string): Promise<void> {
    // Check extension
    if (path.extname(filePath).toLowerCase() !== ".pdf") {
      throw new Error("File must be a PDF");
    }

    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`PDF not found at: ${filePath}`);
    }
  }

  private async readPdf(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
}
