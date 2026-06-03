import { DocumentParser } from "./parser.interface.js";
import {
  ParsedDocument,
  ParsedSection,
  PdfLine,
  SourceType,
} from "../types.js";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
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

      // Step 5: Clean text in each section
      sections.forEach((section) => {
        section.content = cleanText(section.content);
        section.paragraphs.forEach((para) => {
          para.text = cleanText(para.text);
        });
      });
      logger.info(`Text cleaning completed`);

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

  // This method processes each page of the PDF and extracts text content while preserving page boundaries
  private async extractContentFromPdfPages(pdf: any): Promise<ParsedSection[]> {
    const page: ParsedSection[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      logger.info(`Processing page ${pageNum} of ${pdf.numPages}`);

      const pageData = await pdf.getPage(pageNum);
      const textContent = await pageData.getTextContent();
      const pageText = this.buildParagraphs(textContent.items);

      if (pageText.trim().length === 0) {
        logger.warn(`Page ${pageNum} is empty or contains non-text content`);
      }

      page.push({
        pageNumber: pageNum,
        content: pageText,
        paragraphs: pageText.split("\n\n").map((para, index) => ({
          id: `p${index + 1}`,
          index,
          text: para.trim(),
        })),
      });

      logger.info({ characterCount: pageText.length });
    }

    logger.info({ totalPages: pdf.numPages }, `Content extraction completed`);
    return page;
  }

  // This method reconstructs paragraphs based on the Y position of text items
  private buildParagraphs(items: any[]): string {
    const lines: PdfLine[] = []; // To store the reconstructed lines
    const gapsY: number[] = []; // To store the gaps between lines for median calculation

    let currentY: number | null = null; // Track the current Y position to determine line breaks
    let currentLine = ""; // Accumulate text for the current line

    for (const item of items) {
      if (!("str" in item)) continue;

      // If the text item is just a page number, skip it
      const isPageNumber = /^\d+$/.test(item.str.trim());
      if (isPageNumber) {
        continue;
      }

      const y: number = item.transform[5];

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
    const paragraphs: string[] = [];

    let currentParagraph = lines[0]!.text;

    for (let i = 1; i < lines.length; i++) {
      const prev = lines[i - 1]!;
      const current = lines[i]!;

      const gap = Math.abs(prev.y - current.y);

      const isParagraphBreak = gap > medianGap * 1.5;

      if (isParagraphBreak) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = current.text;
      } else {
        currentParagraph += " " + current.text;
      }
    }
    paragraphs.push(currentParagraph.trim());
    return paragraphs.join("\n\n");
  }
}
