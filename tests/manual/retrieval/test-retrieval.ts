import { ChromaStore } from "./../../../src/vector-store/chroma.store.js";
import { gemini } from "./../../../src/config/constants";
import { GeminiEmbedder } from "../../../src/embeddings/embedder/gemini.embedder.js";
import { RetrievalService } from "../../../src/retrieval/retrieval.service.js";

const main = async () => {
  const embedder = new GeminiEmbedder(gemini);
  const vectorStore = new ChromaStore();
  const retrieval = new RetrievalService(embedder, vectorStore, "documents");

  const queries = [
    "Does AI really poses the risk of human extinction?",
    "What happened in March 2023?",
    "Can you define AGI?",
  ];

  for (const query of queries) {
    console.log("\n====================================");

    console.log(`Query: ${query}`);

    const results = await retrieval.retrieve(query, {
      topK: 5,
    });

    results.forEach((result, index) => {
      console.log(`\n#${index + 1}`);

      console.log(`Heading: ${result.headingPath?.join(" > ") ?? "N/A"}`);

      console.log(result.content.slice(0, 250));
    });

    console.table(
      results.map((r) => ({
        heading: r.headingPath?.join(" > "),

        source: r.source,

        score: r.score,
      })),
    );
  }
};

main().catch(console.error);
