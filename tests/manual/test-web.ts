import { WebParser } from "../../src/ingestion/parsers/web.parser.js";

const main = async () => {
  const parser = new WebParser();
  const result = await parser.parse("https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API");

  setTimeout(() => {
    console.log("\n\nParsed Web Doc: ", result.sections);
  }, 1000);
};

main();
