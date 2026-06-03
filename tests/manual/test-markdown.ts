import { MarkdownParser } from "../../src/ingestion/parsers/markdown.parser.js";

const main = async () => {
  const parser = new MarkdownParser();
  const result = await parser.parse(
    "./README.md",
  );

  setTimeout(() => {
    console.log("\n\nParsed Markdown: ", result);
  }, 1000);
};

main();
