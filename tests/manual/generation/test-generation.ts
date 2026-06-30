import { AnswerGenerator } from "./../../../src/llm/answer-generator";
import { PromptBuilder } from "./../../../src/llm/prompt-builder";
import { RetrievalService } from "./../../../src/retrieval/retrieval.service";
import { GenerationPipeline } from "./../../../src/pipelines/generation.pipeline";
import { ChromaStore } from "../../../src/vector-store/chroma.store.js";
import { GeminiEmbedder } from "../../../src/embeddings/embedder/gemini.embedder.js";
import { gemini } from "../../../src/config/constants.js";

const main = async () => {
  const embedder = new GeminiEmbedder(gemini);
  const vectorStore = new ChromaStore();
  const retrievalService = new RetrievalService(
    embedder,
    vectorStore,
    "documents",
  );

  const promptBuilder = new PromptBuilder();
  const answerGenerator = new AnswerGenerator(gemini);

  const generationPipeline = new GenerationPipeline(
    retrievalService,
    promptBuilder,
    answerGenerator,
  );

  const response = await generationPipeline.generateAnswer(
    "Does AI really poses the risk of human extinction?",
  );

  console.log(response);

  response.retrievedChunks.forEach((chunk: any) => {
    if (chunk.sourceType === "pdf") console.log(chunk.pageNumber);
    else console.log(chunk.headingPath?.join(" > "));
  });
};

main();
