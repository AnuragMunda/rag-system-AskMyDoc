import { EmbeddedChunk } from "@/shared/types/embedding.types.js";
import { ChromaClient } from "chromadb";

export class ChromaStore {
  private client = new ChromaClient();

  async store(
    collectionName: string,
    embeddedChunks: EmbeddedChunk[],
    collectionMetadata?: Record<string, string | number>,
  ) {
    try {
      const collection = await this.getOrCreateCollection(
        collectionName,
        collectionMetadata,
      );

      await collection.add({
        ids: embeddedChunks.map((ec) => ec.chunk.id),
        embeddings: embeddedChunks.map((ec) => ec.embedding),
        documents: embeddedChunks.map((ec) => ec.chunk.content),
        metadatas: embeddedChunks.map((ec) => ({
          documentId: ec.chunk.documentId,
          source: ec.chunk.metadata.source,
          sourceType: ec.chunk.metadata.sourceType,
          chunkIndex: ec.chunk.chunkIndex,
          pageNumber: ec.chunk.metadata.pageNumber ?? 0,
          headingPath: ec.chunk.metadata.headingPath?.join(" > ") ?? "",
          blockIds: JSON.stringify(ec.chunk.metadata.blockIds),
        })),
      });
    } catch (error) {
      throw new Error(
        `Failed to store collection: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async query(embedding: number[], topK = 10, collectionName: string) {
    const collection = await this.getCollection(collectionName);
    return collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    });
  }

  private async getOrCreateCollection(
    collectionName: string,
    metadata?: Record<string, string | number>,
  ) {
    const collection = await this.client.getOrCreateCollection({
      name: collectionName,
      ...(metadata ? { metadata } : {}),
    });
    return collection;
  }

  async getCollection(collectionName: string) {
    const collection = await this.client.getCollection({
      name: collectionName,
    });
    return collection;
  }

  /** Returns all collections in the database. */
  async listCollections() {
    return this.client.listCollections();
  }

  /** Deletes a single collection by name. */
  async deleteCollection(name: string) {
    return this.client.deleteCollection({ name });
  }
}
