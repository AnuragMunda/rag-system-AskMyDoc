import crypto from "node:crypto";

import { logger } from "@/shared/logger/logger.js";
import {
  BlockRef,
  Chunk,
  ChunkerOptions,
  ChunkMetadata,
  ParsedDocument,
  SourceType,
} from "../../shared/types/ingestion.types.js";
import { countTokens } from "./tokeniser.js";
import { updateHeadingStack } from "@/shared/utils/helper.js";

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
    const blocks = this.flattenDocument(document);
    logger.info("Document Flattened");

    // Step 2: Build chunks
    logger.info("Building chunks");
    logger.info("...............");
    const chunks = await this.buildChunks(
      blocks,
      document.id,
      document.sourceType,
      document.source,
    );
    logger.info("...............");
    logger.info({ chunksGenerated: chunks.length }, "Chunking successful");
    logger.info(
      "\n<--------------------------------------------------------->\n",
    );

    return chunks;
  }

  // This method carry out the entire process of build chunks from a flatten document
  private async buildChunks(
    blocks: BlockRef[],
    documentId: string,
    sourceType: SourceType,
    source: string,
  ): Promise<Chunk[]> {
    const chunks: Chunk[] = [];

    let chunkIndex = 0;

    let currentBlocks: BlockRef[] = [];

    let lastHeadingPath: string[] = [];
    let lastPageNumber: number | undefined;

    const enforceHeadingBoundaries = sourceType !== "pdf";

    const flushChunk = async () => {
      if (currentBlocks.length === 0) {
        return;
      }

      const chunk = await this.createChunk({
        documentId,
        chunkIndex,
        blocks: currentBlocks,
        metadata: {
          headingPath: lastHeadingPath.length > 0 ? [...lastHeadingPath] : [],
          pageNumber: lastPageNumber ?? 0,
          sourceType,
          source,
        },
      });

      chunks.push(chunk);
      chunkIndex++;
    };

    for (const [index, block] of blocks.entries()) {
      if (index % 5 === 0) {
        logger.info(`Please wait...`);
      }

      if (currentBlocks.length === 0) {
        currentBlocks.push(block);

        lastHeadingPath = [...block.headingPath!];
        lastPageNumber = block.pageNumber;

        continue;
      }

      const headingChanged =
        enforceHeadingBoundaries &&
        !this.sameHeadingPath(
          currentBlocks[0]?.headingPath ?? [],
          block.headingPath!,
        );

      if (headingChanged) {
        await flushChunk();

        // Do NOT apply overlap across headings.
        currentBlocks = [block];

        lastHeadingPath = [...block.headingPath!];
        lastPageNumber = block.pageNumber;

        continue;
      }

      const candidateBlocks = [...currentBlocks, block];

      const candidateText = candidateBlocks.map((b) => b.text).join("\n\n");

      const candidateTokens = await countTokens(candidateText);

      const exceedsLimit = candidateTokens > this.maxTokens;

      if (exceedsLimit) {
        await flushChunk();

        // Overlap only on token overflow.
        const { overlapBlocks } = await this.computeOverlap(currentBlocks);

        currentBlocks = [...overlapBlocks, block];

        lastHeadingPath = [...block.headingPath!];
        lastPageNumber = block.pageNumber;

        continue;
      }

      currentBlocks.push(block);

      lastHeadingPath = [...block.headingPath!];
      lastPageNumber = block.pageNumber;
    }

    await flushChunk();

    return chunks;
  }

  // This method creates a new chunk
  private async createChunk({
    documentId,
    chunkIndex,
    blocks,
    metadata,
  }: {
    documentId: string;
    chunkIndex: number;
    blocks: BlockRef[];
    metadata: ChunkMetadata;
  }): Promise<Chunk> {
    const content = blocks.map((b) => b.text).join("\n\n");

    const tokenCount = await countTokens(content);

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
      content,
      tokenCount,
      metadata: {
        ...metadata,

        blockIds: blocks.map((block) =>
          this.parseBlockId(
            block.pageNumber,
            block.headingPath!,
            block.blockId,
          ),
        ),
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
  private async computeOverlap(blocks: BlockRef[]): Promise<{
    overlapBlocks: BlockRef[];
    overlapIds: string[];
  }> {
    const overlapBlocks: BlockRef[] = [];

    let tokenCount = 0;

    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i]!;

      // Avoid duplicating large structural blocks.
      if (block.type === "code" || block.type === "table") {
        continue;
      }

      const blockTokens = await countTokens(block.text);

      if (
        tokenCount + blockTokens > this.overlapTokens &&
        overlapBlocks.length > 0
      ) {
        break;
      }

      overlapBlocks.unshift(block);

      tokenCount += blockTokens;
    }

    return {
      overlapBlocks,

      overlapIds: overlapBlocks.map((block) =>
        this.parseBlockId(block.pageNumber, block.headingPath!, block.blockId),
      ),
    };
  }

  private sameHeadingPath(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => value === b[index]);
  }

  private parseBlockId(
    pageNumber: number | undefined,
    headingPath: string[],
    blockId: string,
  ): string {
    if (pageNumber) {
      return `page-${pageNumber}:${blockId}`;
    }

    if (headingPath.length > 0) {
      return `heading-${headingPath.join("/")}:${blockId}`;
    }

    return blockId;
  }

  private flattenDocument(document: ParsedDocument): BlockRef[] {
    const blocks: BlockRef[] = [];

    const headingStack: string[] = [];

    let headingPath: string[] = [];

    for (const section of document.sections) {
      if (section.heading && section.headingLevel) {
        headingPath = updateHeadingStack(
          headingStack,
          section.headingLevel,
          section.heading,
        );
      }

      for (const block of section.blocks) {
        blocks.push({
          blockId: block.id,
          text: block.text,
          type: block.type,
          pageNumber: section.pageNumber!,
          headingPath: [...headingPath],
        });
      }
    }

    return blocks;
  }
}
