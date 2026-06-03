import fs from "node:fs/promises";
import path from "node:path";

import { v4 as uuidv4 } from "uuid";

import {
  MarkdownSection,
  ParsedDocument,
  ParsedSection,
  SourceType,
} from "../types.js";
import { DocumentParser } from "./parser.interface.js";
import { logger } from "@/shared/logger/logger.js";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

export class MarkdownParser implements DocumentParser {
  async parse(filePath: string): Promise<ParsedDocument> {
    logger.info("Starting markdown ingestion\n");

    try {
      // Step:1 Read the markdown file
      const markdown = await this.readMarkdown(filePath);

      logger.info({ filePath }, "Markdown loaded successfully");

      // Step:2 Parse the markdown content into an AST (Abstract Syntax Tree)
      const tree = unified().use(remarkParse).parse(markdown);

      // Step:3 Extract content from AST, preserving section boundaries based on headings
      const sections = await this.extractContentFromMarkdown(tree);

      if (sections.length === 0) {
        throw new Error("No extractable content found in markdown");
      }

      logger.info(
        { characterCount: markdown.length },
        "Content extraction completed",
      );

      // Step:4 Normalize extracted content into unified format
      const parsedSection: ParsedSection[] = sections.map((section) => ({
        heading: {
          text: section.heading!,
          headingLevel: section.headingLevel!,
        },
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
        title: path.basename(filePath, path.extname(filePath)),
        sourceType: "markdown" as SourceType,
        source: filePath,
        sections: parsedSection,
        metadata: {
          parsedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Markdown: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async readMarkdown(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
  }

  private extractText(node: any): string {
    if (node.value) {
      return node.value;
    }

    if (!node.children) {
      return "";
    }

    return node.children.map((child: any) => this.extractText(child)).join("");
  }

  private async extractContentFromMarkdown(
    tree: any,
  ): Promise<MarkdownSection[]> {
    const sections: MarkdownSection[] = [];
    let currentSection: MarkdownSection = {
      heading: "",
      headingLevel: 0,
      paragraphs: [],
    };

    logger.info(`Extracting markdown content`);

    visit(tree, (node: any) => {
      if (node.type === "heading") {
        sections.push(currentSection);

        currentSection = {
          heading: this.extractText(node),
          headingLevel: node.depth,
          paragraphs: [],
        };
      }

      if (node.type === "paragraph") {
        currentSection.paragraphs.push(this.extractText(node));
      }

    });

    sections.push(currentSection);

    return sections.filter(
      (section) => section.heading || section.paragraphs.length > 0,
    );
  }
}
