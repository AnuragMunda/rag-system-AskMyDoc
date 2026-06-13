import { EmbeddingService } from "@/embeddings/embedding.service.js";
import { Chunker } from "@/chunking/chunker.js";
import { ParsedDocument } from "@/shared/types/ingestion.types.js";
import { ChromaStore } from "@/vector-store/chroma.store.js";

export class IndexingPipeline {
  constructor(
    private readonly chunker: Chunker,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: ChromaStore,
  ) {}

  async index(collectionName: string, document: ParsedDocument) {
    const chunks = await this.chunker.chunkDocument(document);

    const embedded = await this.embeddingService.embedChunk(chunks);

    await this.vectorStore.store(collectionName, embedded);
  }
}
