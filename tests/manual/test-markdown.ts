import { ParserFactory } from "../../src/ingestion/factory/parser.factory.js";

const main = async () => {
  const parser = ParserFactory.create("markdown");
  const result = await parser.parse("./README.md");

  setTimeout(() => {
    console.log("\nParsed Markdown: ", result);
  }, 1000);
};

main();
