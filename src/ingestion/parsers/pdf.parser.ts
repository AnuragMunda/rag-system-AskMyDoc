import { DocumentParser } from "./parser.interface.js";
import { ParsedDocument, ParsedSection, SourceType } from "../types.js";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { logger } from "@/shared/logger/logger.js";

export class PdfParser implements DocumentParser {
  async parse(filePath: string): Promise<ParsedDocument> {
    logger.info("Starting PDF ingestion\n");

    try {
      // Step 1: validate the file
      await this.validateFile(filePath);

      // Step 2: read binary
      const pdfBuffer = await this.readPdf(filePath);

      logger.info(
        { filePath, size: { bytes: pdfBuffer.length } },
        "PDF loaded successfully",
      );

      // Step 3: Get PDF document
      const pdf = await getDocument({
        data: new Uint8Array(pdfBuffer),
      }).promise;

      // Step 4: Extract content from PDF, page-by-page (Preserve page boundaries)
      const sections = await this.extractContentFromPdfPages(pdf);
      logger.info({ totalPages: pdf.numPages }, `Content extraction completed`);

      // Return unified format
      return {
        id: uuidv4(),
        title: path.basename(filePath),
        sourceType: "pdf" as SourceType,
        source: filePath,
        sections,
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

  private async extractContentFromPdfPages(pdf: any): Promise<ParsedSection[]> {
    const page: ParsedSection[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      logger.info(`Processing page ${pageNum} of ${pdf.numPages}`);
      
      const pageData = await pdf.getPage(pageNum);
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      if (pageText.trim().length === 0) {
        logger.warn(`Page ${pageNum} is empty or contains non-text content`);
      }

      page.push({
        content: pageText,
        pageNumber: pageNum,
      });

      logger.info({ characterCount: pageText.length });
    }
    return page;
  }
}
