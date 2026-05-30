import { PdfParser } from "../../src/ingestion/parsers/pdf.parser.js";

const main = async () => {
  const parser = new PdfParser();
  const result = await parser.parse("./tests/fixtures/pdfs/sample.pdf");
  console.log(result);
};

main();
