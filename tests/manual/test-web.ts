import { ParserFactory } from "../../src/ingestion/factory/parser.factory.js";

const main = async () => {
  const parser = ParserFactory.create("web");
  const result = await parser.parse("https://www.solanakit.com/docs");

  setTimeout(() => {
    console.log("\nParsed Web Doc: ", result);
  }, 1000);
};

main();
