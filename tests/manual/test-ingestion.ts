import { Chunker } from "../../src/ingestion/chunking/chunker";
import { ingest } from "../../src/ingestion/ingest";

async function main() {
  const pdf = await ingest("./tests/fixtures/pdfs/MythOfAGI.pdf");
  // console.log(pdf.title, pdf.sourceType);

  // const md = await ingest("./README.md");
  // console.log(md.title, md.sourceType);

  // const web = await ingest(
  //   "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
  // );
  // console.log(web.title, web.sourceType);

  const chunker = new Chunker({ maxTokens: 700, overlapTokens: 100 });
  const chunks = await chunker.chunkDocument(pdf);

  console.log(`Generated ${chunks.length} chunks`);
  console.log("Chunks: ", chunks);
}

main();
