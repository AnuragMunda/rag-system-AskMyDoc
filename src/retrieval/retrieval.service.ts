import { GeminiEmbedder } from "@/embeddings/embedder/gemini.embedder.js";
import {
  RetrievalOptions,
  RetrievedChunk,
} from "@/shared/types/retrieval.types.js";
import { ChromaStore } from "@/vector-store/chroma.store.js";

export class RetrievalService {
  constructor(
    private readonly embedder: GeminiEmbedder,
    private readonly vectorStore: ChromaStore,
    private readonly collectionName: string,
  ) {}

  async retrieve(
    query: string,
    options: RetrievalOptions = {},
  ): Promise<RetrievedChunk[]> {
    const topK = options.topK ?? 10;

    const queryEmbedding = await this.embedder.embed(query);
    const result = await this.vectorStore.query(
      queryEmbedding,
      topK,
      this.collectionName,
    );

    const documents = result.documents?.[0] ?? [];
    const ids = result.ids?.[0] ?? [];
    const distances = result.distances?.[0] ?? [];
    const metadata = result.metadatas?.[0] ?? [];

    return documents.map((document, index) => {
      const meta = metadata[index] ?? {};

      return {
        chunkId: ids[index] ?? "",
        content: document ?? "",
        distance: distances[index] ?? 0,
        source: String(meta["source"] ?? ""),
        sourceType: meta["sourceType"] as any,
        pageNumber: meta["pageNumber"] as number,
        headingPath:
          typeof meta["headingPath"] === "string"
            ? String(meta["headingPath"]).split(" > ")
            : [],
        blockIds:
          typeof meta["blockIds"] === "string"
            ? JSON.parse(String(meta["blockIds"]))
            : [],
      };
    });
  }
}
