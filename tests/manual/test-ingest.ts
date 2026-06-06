import { ingest } from "./../../src/ingestion/ingest";

async function main() {
  const pdf = await ingest("./tests/fixtures/pdfs/sample.pdf");

  console.log(pdf.title, pdf.sourceType);

  const md = await ingest("./README.md");

  console.log(md.title, md.sourceType);

  const web = await ingest(
    "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
  );

  console.log(web.title, web.sourceType);
}

main();
