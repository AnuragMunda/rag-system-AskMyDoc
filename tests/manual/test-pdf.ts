import { ParserFactory } from "./../../src/ingestion/factory/parser.factory";

const main = async () => {
  const parser = ParserFactory.create("pdf");
  const result = await parser.parse(
    "./tests/fixtures/pdfs/MythOfAGI.pdf",
  );

  setTimeout(() => {
    console.log("\nParsed PDF: ", result);
  }, 1000);
};

main();
