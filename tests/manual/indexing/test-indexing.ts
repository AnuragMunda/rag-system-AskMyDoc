import { ChromaStore } from "../../../src/vector-store/chroma.store.js";
import { IndexingPipeline } from "./../../../src/pipelines/indexing.pipeline";
import { EmbeddingService } from "../../../src/embeddings/embedding.service.js";
import { Chunker } from "../../../src/chunking/chunker";
import { ingest } from "../../../src/ingestion/ingest.js";

const main = async () => {
  const pdf = await ingest("./tests/fixtures/pdfs/MythOfAGI.pdf");

  const chunker = new Chunker({ maxTokens: 700, overlapTokens: 100 });
  const embeddingService = new EmbeddingService();
  const store = new ChromaStore();

  const pipeline = new IndexingPipeline(chunker, embeddingService, store);

  const collection = "documents";
  await pipeline.index(collection, pdf);

  const documentCollection = await store.getCollection(collection);
  console.log(await documentCollection.peek({}));
};

main();
