import { env } from "@/config/env.js";
import { EmbeddedChunk } from "@/shared/types/embedding.types.js";
import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";
import { ChromaClient, Collection } from "chromadb";

export class ChromaStore {
  private client = new ChromaClient();

  async store(collectionName: string, embeddedChunks: EmbeddedChunk[]) {
    try {
      const collection = await this.getOrCreateCollection(collectionName);

      await collection.add({
        ids: embeddedChunks.map((ec) => ec.chunk.id),
        embeddings: embeddedChunks.map((ec) => ec.embedding),
        documents: embeddedChunks.map((ec) => ec.chunk.content),
        metadatas: embeddedChunks.map((ec) => ({
          documendId: ec.chunk.documentId,
          source: ec.chunk.metadata.source,
          sourceType: ec.chunk.metadata.sourceType,
          chunkIndex: ec.chunk.chunkIndex,
          pageNumber: ec.chunk.metadata.pageNumber ?? 0,
          headingPath: ec.chunk.metadata.headingPath?.join(" > ") ?? "",
        })),
      });
    } catch (error) {
      throw new Error(
        `Failed to store collection: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async getOrCreateCollection(collectionName: string) {
    const collection = await this.client.getOrCreateCollection({
      name: collectionName,
    });
    return collection;
  }

  async getCollection(collectionName: string) {
    const collection = await this.client.getCollection({
      name: collectionName,
    });
    return collection;
  }
}
