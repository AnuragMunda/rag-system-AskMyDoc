import crypto from "node:crypto";

import { logger } from "@/shared/logger/logger.js";
import {
  Chunk,
  ChunkerOptions,
  ChunkMetadata,
  Overlap,
  ParagraphRef,
  ParsedDocument,
} from "../types.js";
import { countTokens } from "./tokeniser.js";

export class Chunker {
  private readonly maxTokens: number;
  private readonly overlapTokens: number;

  constructor(options: ChunkerOptions = {}) {
    this.maxTokens = options.maxTokens ?? 700;
    this.overlapTokens = options.overlapTokens ?? 100;
  }

  // The main method to chunk a document
  async chunkDocument(document: ParsedDocument): Promise<Chunk[]> {
    logger.info(
      { documentType: document.sourceType, source: document.source },
      `Starting Chunking`,
    );

    // Step 1: Flatten the document
    const paragraphs = this.flattenDocument(document);
    logger.info("Document Flattened");

    // Step 2: Build chunks
    logger.info("Building chunks");
    logger.info("...............");
    const chunks = await this.buildChunks(paragraphs, document.id);
    logger.info({ chunksGenerated: chunks.length }, "Chunking successful");
    logger.info(
      "\n<--------------------------------------------------------->\n",
    );

    return chunks;
  }

  // This method carry out the entire process of build chunks from a flatten document
  private async buildChunks(
    paragraphs: ParagraphRef[],
    documentId: string,
  ): Promise<Chunk[]> {
    const chunks: Chunk[] = []; // Store for all the chunks

    let chunkIndex = 0; // Chunk count
    let currentParagraphs: string[] = [];

    let paragraphIds: string[] = [];
    let lastHeading = "";
    let lastPageNumber = 0;

    // Accumulate tokens -> Check overflow -> Create and Save Chunks -> Add overlap
    for (let i = 0; i < paragraphs.length; i++) {
      logger.info(`Processing paragraph ${i + 1} of ${paragraphs.length}`);
      const para = paragraphs[i]!;

      const candidate = currentParagraphs.concat(para.text);
      const candidateText = candidate.join("\n\n");

      const tokenCount = await countTokens(candidateText);

      const parsedParaId = this.parseParagraphId(
        para.pageNumber ?? 0,
        para.paragraphId,
      );

      const isOverflow =
        tokenCount > this.maxTokens && currentParagraphs.length > 0;

      // If current Chunk is full, then save and create a new Chunk
      if (isOverflow) {
        const chunk = await this.createChunk({
          documentId,
          chunkIndex,
          paragraphs: currentParagraphs,
          metadata: {
            heading: para.heading ?? "",
            pageNumber: para.pageNumber ?? 0,
          },
          paragraphIds,
        });

        chunks.push(chunk);
        chunkIndex++;

        // Compute and add overlap
        const { overlapParagraphs, overlapIds } = await this.computeOverlap(
          currentParagraphs,
          paragraphIds,
        );

        currentParagraphs = [...overlapParagraphs, para.text];
        paragraphIds = [...overlapIds, parsedParaId];
        lastHeading = para.heading ?? "";
        lastPageNumber = para.pageNumber ?? 0;
      } else {
        currentParagraphs.push(para.text);
        paragraphIds.push(parsedParaId);
      }
    }

    if (currentParagraphs.length > 0) {
      const chunk = await this.createChunk({
        documentId,
        chunkIndex,
        paragraphs: currentParagraphs,
        metadata: {
          heading: lastHeading,
          pageNumber: lastPageNumber,
        },
        paragraphIds,
      });

      chunks.push(chunk);
      chunkIndex++;
    }

    return chunks;
  }

  // This method creates a new chunk
  private async createChunk({
    documentId,
    chunkIndex,
    paragraphs,
    metadata,
    paragraphIds,
  }: {
    documentId: string;
    chunkIndex: number;
    paragraphs: string[];
    metadata: ChunkMetadata;
    paragraphIds: string[];
  }): Promise<Chunk> {
    const text = paragraphs.join("\n\n");

    const tokenCount = await countTokens(text);

    if (tokenCount < 50) {
      logger.warn(`Very small chunk detected (${tokenCount} tokens)`);
    }

    if (tokenCount > this.maxTokens + 200) {
      logger.warn(`Large chunk detected (${tokenCount} tokens)`);
    }

    return {
      id: this.generateChunkId(documentId, chunkIndex),
      documentId,
      chunkIndex,
      content: text,
      tokenCount,
      metadata: {
        ...metadata,
        paragraphIds,
      },
    };
  }

  // This method generates a deterministic chunk id
  private generateChunkId(documentId: string, chunkIndex: number): string {
    return crypto
      .createHash("sha256")
      .update(`${documentId}:${chunkIndex}`)
      .digest("hex");
  }

  // This method returns the tokens that satisfies the overlap
  private async computeOverlap(
    paragraphs: string[],
    paragraphIds: string[],
  ): Promise<Overlap> {
    const overlap: Overlap = { overlapParagraphs: [], overlapIds: [] };

    let tokenCount = 0;

    for (let i = paragraphs.length - 1; i >= 0; i--) {
      const paragraph = paragraphs[i]!;

      const paragraphTokens = await countTokens(paragraph);

      if (
        tokenCount + paragraphTokens > this.overlapTokens &&
        overlap.overlapParagraphs.length > 0
      ) {
        break;
      }

      overlap.overlapParagraphs.unshift(paragraph);
      overlap.overlapIds.unshift(paragraphIds[i]!);

      tokenCount += paragraphTokens;
    }

    return overlap;
  }

  private parseParagraphId(pageNumber: number, paraId: string): string {
    return `page-${pageNumber}:${paraId}`;
  }

  private flattenDocument(document: ParsedDocument): ParagraphRef[] {
    const refs: ParagraphRef[] = [];

    for (const section of document.sections) {
      for (const paragraph of section.paragraphs) {
        refs.push({
          text: paragraph.text,
          paragraphId: paragraph.id,
          pageNumber: section.pageNumber ?? 0,
          heading: section.heading ?? "",
        });
      }
    }

    return refs;
  }
}
