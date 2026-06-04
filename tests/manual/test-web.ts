import { WebParser } from "../../src/ingestion/parsers/web.parser.js";

const main = async () => {
  const parser = new WebParser();
  const result = await parser.parse("https://www.solanakit.com/docs");

  setTimeout(() => {
    console.log("\n\nParsed Web Doc: ", result);
  }, 1000);
};

main();
