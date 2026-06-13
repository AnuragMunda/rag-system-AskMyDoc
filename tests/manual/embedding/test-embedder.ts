import { gemini } from "../../../src/config/constants";
import { GeminiEmbedder } from "./../../../src/embeddings/gemini.embedder";

const main = async () => {
  const embedder = new GeminiEmbedder(gemini);
  const embedding = await embedder.embed("What is the meaning of life?");
  console.log(`Single Embedder: Length of embedding: ${embedding.length}`);

  const texts = [
    "What is the meaning of life?",
    "What is the purpose of existence?",
    "How do I bake a cake?",
  ];
  const embeddings = await embedder.embedBatch(texts);
  console.log(
    `Batch Embedder: Total embeddings generated: ${embeddings.length}`,
  );
};

main();
