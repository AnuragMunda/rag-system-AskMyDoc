import { v4 as uuidv4 } from "uuid";
import jsdom from "jsdom";

import { ParsedDocument, SourceType, WebSection } from "../types.js";
import { DocumentParser } from "./parser.interface.js";
import { Readability } from "@mozilla/readability";
import { parseArgs } from "util";

export class WebParser implements DocumentParser {
  async parse(url: string): Promise<ParsedDocument> {
    try {
      // Step 1: Fetch Webpage
      const html = await this.fetchPage(url);

      // Step 2: Extract main content
      const { JSDOM } = jsdom;
      const dom = new JSDOM(html, { url });

      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error("Unable to extract article content");
      }

      // Step 3: Parse article HTML
      const contentDom = new JSDOM(article.content!);
      const document = contentDom.window.document;

      // Step 4: Extract headings and paragraphs
      const sections = this.extractSections(document);

      // Step 5: Normalise extracted content into unified format
      const parsedSection = sections.map((section) => ({
        heading: section.heading!,
        content: section.paragraphs.join("\n\n"),
        paragraphs: section.paragraphs.map((para, index) => ({
          id: `p${index + 1}`,
          index,
          text: para,
        })),
      }));

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

  private extractSections(document: Document): WebSection[] {
    const sections: WebSection[] = [];

    let currentSection: WebSection = {
      heading: "",
      paragraphs: [],
    };

    const elements = document.body.querySelectorAll(
      "h1,h2,h3,h4,h5,h6,p,li,pre,code",
    );

    elements.forEach((element) => {
      const tag = element.tagName.toLowerCase();
      const text = element.textContent.trim();

      if (!text) return;

      if (tag.startsWith("h")) {
        sections.push(currentSection);

        currentSection = {
          heading: text,
          paragraphs: [],
        };
      }

      if (tag === "p") {
        currentSection.paragraphs.push(text);
      }

      if (tag === "li") {
        currentSection.paragraphs.push(`• ${text}`);
      }

      if (tag === "pre") {
        currentSection.paragraphs.push(`CODE:\n${text}`);
      }
    });

    sections.push(currentSection);

    return sections.filter(
      (section) => section.heading || section.paragraphs.length > 0,
    );
  }
}
