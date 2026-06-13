import { v4 as uuidv4 } from "uuid";
import jsdom from "jsdom";

import {
  ParsedDocument,
  ParsedSection,
  SourceType,
  WebSection,
} from "@/shared/types/ingestion.types.js";
import { DocumentParser } from "./parser.interface.js";
import { Readability } from "@mozilla/readability";
import { logger } from "@/shared/logger/logger.js";
import { updateHeadingStack } from "@/shared/utils/helper.js";

export class WebParser implements DocumentParser {
  async parse(url: string): Promise<ParsedDocument> {
    logger.info("Starting webpage ingestion\n");

    try {
      // Step 1: Fetch Webpage
      const html = await this.fetchPage(url);
      logger.info({ url }, "webpage fetched successfully");

      // Step 2: Extract main content
      const { JSDOM } = jsdom;
      const dom = new JSDOM(html, { url });

      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error("Unable to extract article content");
      }

      logger.info({ contentLength: article.length }, "Main content extracted");

      // Step 3: Parse article HTML
      const contentDom = new JSDOM(article.content!);
      const document = contentDom.window.document;

      // Step 4: Extract headings and paragraphs
      logger.info("Parsing started");
      const sections = this.extractSections(document, article.title ?? "");

      // Step 5: Normalise extracted content into unified format
      const parsedSection: ParsedSection[] = sections.map((section) => ({
        heading: section.heading!,
        headingLevel: section.headingLevel!,
        headingPath: section.headingPath,
        content: section.blocks.map((block) => block.text).join("\n\n"),
        blocks: section.blocks.map((block, index) => ({
          id: `para-${index + 1}`,
          index,
          type: block.type,
          text: block.text,
        })),
      }));
      logger.info("Parsing successful");
      logger.info(
        "\n<--------------------------------------------------------->\n",
      );

      // Return unified format
      return {
        id: uuidv4(),
        title: article.title || new URL(url).hostname,
        sourceType: "web" as SourceType,
        source: url,
        sections: parsedSection,
        metadata: {
          parsedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Webpage: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async fetchPage(url: string): Promise<string> {
    const page = await fetch(url);

    if (!page.ok) {
      throw new Error(`Failed to fetch page: ${page.status}`);
    }

    return page.text();
  }

  // Extracts content from the page
  private extractSections(document: Document, title: string): WebSection[] {
    const sections: WebSection[] = [];

    let currentSection: WebSection = {
      heading: "Introduction",
      headingLevel: 0,
      headingPath: [title, "Introduction"],
      blocks: [],
    };

    let blockIndex = 0;

    const elements: NodeListOf<Element> = document.body.querySelectorAll(
      `
    h1,h2,h3,h4,h5,h6,
    p,
    ul,
    ol,
    pre,
    table,
    dl
    `,
    );
    const headingStack: string[] = [title];

    elements.forEach((element) => {
      const tag = element.tagName.toLowerCase();
      const text = this.extractRichText(element);

      if (!text) return;

      if (tag.startsWith("h")) {
        const level = Number(tag.slice(1));

        const headingPath = updateHeadingStack(headingStack, level, text);

        sections.push(currentSection);

        currentSection = {
          heading: text,
          headingLevel: level,
          headingPath,
          blocks: [],
        };
      }

      if (tag === "p") {
        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "definition",
          text,
        });
      }

      if (tag === "dl") {
        const definitions = this.extractDescriptionLists(element);

        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "definition",
          text: definitions.join("\n"),
        });
      }

      if (tag === "ul" || tag === "ol") {
        const items = Array.from(element.querySelectorAll("li"));

        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "list",
          text: items.map((li) => li.textContent?.trim()).join("\n"),
        });
      }

      if (tag === "pre") {
        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "code",
          text,
        });
      }

      if (tag === "table") {
        const rows = Array.from(element.querySelectorAll("tr"));

        const text = rows
          .map((row) =>
            Array.from(row.querySelectorAll("th,td"))
              .map((cell) => cell.textContent?.trim())
              .join(" | "),
          )
          .join("\n");

        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "table",
          text,
        });
      }
    });

    sections.push(currentSection);

    return sections.filter(
      (section) => section.heading || section.blocks.length > 0,
    );
  }

  // For extracting text from tags within another tag
  private extractRichText(node: Node): string {
    if (node.nodeType === node.TEXT_NODE) {
      return node.textContent ?? "";
    }

    if (!(node instanceof node.ownerDocument!.defaultView!.Element)) {
      return "";
    }

    const tag = node.tagName.toLowerCase();

    if (tag === "code") {
      return `\`${node.textContent?.trim()}\``;
    }

    if (tag === "a") {
      const href = node.getAttribute("href");
      if (href?.startsWith("http")) {
        const replacement = href
          ? `${node.textContent} (${href})`
          : (node.textContent ?? "");

        return replacement;
      }
    }

    return Array.from(node.childNodes)
      .map((child) => this.extractRichText(child))
      .join("");
  }

  // Handle <dl> tags (Description Lists)
  private extractDescriptionLists(element: Element): string[] {
    const entries: string[] = [];

    const children = Array.from(element.children);

    let currentTerm = "";

    for (const child of children) {
      if (child.tagName.toLowerCase() === "dt") {
        currentTerm = child.textContent?.trim() ?? "";
      }

      if (child.tagName.toLowerCase() === "dd" && currentTerm) {
        const description = child.textContent?.trim() ?? "";

        entries.push(`${currentTerm}: ${description}`);
      }
    }

    return entries;
  }
}
