import { Chunker } from './../../../src/chunking/chunker';
import { ingest } from "../../../src/ingestion/ingest";

const main = async () => {
  const pdf = await ingest("./tests/fixtures/pdfs/MythOfAGI.pdf");
  console.log(pdf.title, pdf.sourceType);

  const md = await ingest("./README.md");
  console.log(md.title, md.sourceType);

  const web = await ingest(
    "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
  );
  console.log(web.title, web.sourceType);

  const chunker = new Chunker({ maxTokens: 700, overlapTokens: 100 });
  const pdfChunks = await chunker.chunkDocument(pdf);
  const mdChunks = await chunker.chunkDocument(md);
  const webChunks = await chunker.chunkDocument(web);

  setTimeout(() => {
    console.log(
      `Generated chunks --- pdf: ${pdfChunks.length} chunks, markdown: ${mdChunks.length} chunks, web: ${webChunks.length} chunks,`,
    );
    // console.log("Chunks: ", pdfChunks);
  }, 1000);
};

main();
