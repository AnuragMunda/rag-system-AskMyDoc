import path from "node:path";
import fs from "node:fs/promises";

import { v4 as uuidv4 } from "uuid";
import { getDocument, PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

import { DocumentParser } from "./parser.interface.js";
import {
  ParsedDocument,
  ParsedSection,
  PdfLine,
  SourceType,
} from "@/shared/types/ingestion.types.js";
import { logger } from "@/shared/logger/logger.js";
import { cleanText } from "../cleaners/clean-text.js";
import { findMedian } from "@/shared/utils/statistics.js";

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

      if (sections.length === 0) {
        throw new Error("No extractable content found in PDF");
      }

      // Step 5: Clean text in each section
      sections.forEach((section) => {
        section.content = cleanText(section.content);
        section.blocks.forEach((block) => {
          block.text = cleanText(block.text);
        });
      });
      logger.info(`Parsing successful`);
      logger.info(
        "\n<--------------------------------------------------------->\n",
      );

      // Return unified format
      return {
        id: uuidv4(),
        title: path.basename(filePath, path.extname(filePath)),
        sourceType: "pdf" as SourceType,
        source: filePath,
        sections,
        metadata: {
          pageCount: pdf.numPages,
          parsedAt: new Date().toISOString(),
        },
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

  // This method processes each page of the PDF and extracts text content while preserving page boundaries
  private async extractContentFromPdfPages(
    pdf: PDFDocumentProxy,
  ): Promise<ParsedSection[]> {
    const page: ParsedSection[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      logger.info(`Processing page ${pageNum} of ${pdf.numPages}`);

      const pageData = await pdf.getPage(pageNum);
      const textContent = await pageData.getTextContent();

      const viewport = pageData.getViewport({ scale: 1 });
      const pageHeight = viewport.height;

      const pageText = this.buildParagraphs(textContent.items, pageHeight);

      if (pageText.trim().length === 0) {
        logger.warn(`Page ${pageNum} is empty or contains non-text content`);
      }

      page.push({
        pageNumber: pageNum,
        content: pageText,
        blocks: pageText.split("\n\n").map((block, index) => ({
          id: `block-${index + 1}`,
          index,
          type: "paragraph",
          text: block.trim(),
        })),
      });

      logger.info({ characterCount: pageText.length });
    }

    logger.info({ totalPages: pdf.numPages }, `Content extraction completed`);
    return page;
  }

  // This method reconstructs blocks based on the Y position of text items
  private buildParagraphs(items: any[], pageHeight: number): string {
    const lines: PdfLine[] = []; // To store the reconstructed lines
    const gapsY: number[] = []; // To store the gaps between lines for median calculation

    let currentY: number | null = null; // Track the current Y position to determine line breaks
    let currentLine = ""; // Accumulate text for the current line

    const HEADER_MARGIN = pageHeight * 0.1;
    const FOOTER_MARGIN = pageHeight * 0.1;

    for (const item of items) {
      if (!("str" in item) || item.height < 10) continue;

      // If the text item is just a page number, skip it
      const isPageNumber = /^\d+$/.test(item.str.trim());
      if (isPageNumber) {
        continue;
      }

      const y: number = item.transform[5];

      if (y < FOOTER_MARGIN || y > pageHeight - HEADER_MARGIN) {
        continue;
      }

      if (currentY === null) {
        currentY = y;
      }

      const deltaY = Math.abs(currentY - y);
      gapsY.push(deltaY);

      // If the Y position changes significantly, we consider it a new line
      if (deltaY > 5) {
        lines.push({ y: currentY, text: currentLine.trim() });
        currentLine = item.str;
        currentY = y;
      } else {
        currentLine += " " + item.str;
      }
    }

    if (currentLine.trim()) {
      lines.push({ y: currentY!, text: currentLine.trim() });
    }

    const medianGap = findMedian(gapsY.sort((a, b) => a - b));
    const blocks: string[] = [];

    let currentParagraph = lines[0]!.text;

    for (let i = 1; i < lines.length; i++) {
      const prev = lines[i - 1]!;
      const current = lines[i]!;

      const gap = Math.abs(prev.y - current.y);
      const isParagraphBreak = gap > medianGap * 1.3;

      if (isParagraphBreak) {
        blocks.push(currentParagraph.trim());
        currentParagraph = current.text;
      } else {
        currentParagraph += " " + current.text;
      }
    }
    blocks.push(currentParagraph.trim());
    return blocks.join("\n\n");
  }
}
