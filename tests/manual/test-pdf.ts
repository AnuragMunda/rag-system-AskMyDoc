import { PdfParser } from "../../src/ingestion/parsers/pdf.parser.js";

const main = async () => {
  const parser = new PdfParser();
  const result = await parser.parse(
    "./tests/fixtures/pdfs/sample-multi-page.pdf",
  );

  setTimeout(() => {
    console.log("\n\nParsed PDF: ", result);
  }, 1000);
};

main();
