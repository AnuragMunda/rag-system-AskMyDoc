import {
  geminiListEmbeddingModel,
  geminiSingleEmbeddingModel,
} from "@/config/constants.js";
import { GoogleGenAI } from "@google/genai";

export class GeminiEmbedder {
  constructor(private readonly client: GoogleGenAI) {}

  // This method produces embedding for a single text input
  async embed(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: geminiSingleEmbeddingModel,
      contents: text,
    });

    if (!response.embeddings?.length || !response.embeddings[0]?.values) {
      throw new Error("Cannot generate embeddings");
    }

    return response.embeddings[0].values;
  }

  // This method produces a list of embeddings for mulitple text input
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.models.embedContent({
      model: geminiListEmbeddingModel,
      contents: texts,
    });

    if (!response.embeddings?.length) {
      throw new Error("Cannot generate embeddings");
    }

    const embeddings = response.embeddings.map((embedding) => {
      if (!embedding.values) {
        throw new Error("Cannot generate embeddings");
      }
      return embedding.values;
    });

    return embeddings;
  }
}
