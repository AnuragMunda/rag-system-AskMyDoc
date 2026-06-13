import fs from "node:fs/promises";
import path from "node:path";

import { v4 as uuidv4 } from "uuid";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

import {
  MarkdownSection,
  ParsedDocument,
  ParsedSection,
  SourceType,
} from "@/shared/types/ingestion.types.js";
import { DocumentParser } from "./parser.interface.js";
import { logger } from "@/shared/logger/logger.js";
import remarkGfm from "remark-gfm";
import { updateHeadingStack } from "@/shared/utils/helper.js";

export class MarkdownParser implements DocumentParser {
  async parse(filePath: string): Promise<ParsedDocument> {
    logger.info("Starting markdown ingestion\n");

    try {
      // Step:1 Read the markdown file
      const markdown = await this.readMarkdown(filePath);

      logger.info({ filePath }, "Markdown loaded successfully");

      // Step:2 Parse the markdown content into an AST (Abstract Syntax Tree)
      const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);

      // Step:3 Extract content from AST, preserving section boundaries based on headings
      const sections = await this.extractContentFromMarkdown(tree);

      if (sections.length === 0) {
        throw new Error("No extractable content found in markdown");
      }

      logger.info(
        { characterCount: markdown.length },
        "Content extraction completed",
      );

      // Step:4 Normalise extracted content into unified format
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
      headingPath: [],
      blocks: [],
    };
    let blockIndex = 0;

    logger.info(`Extracting markdown content`);

    const headingStack: string[] = [];

    visit(tree, (node: any, _index, parent: any) => {
      if (node.type === "heading") {
        const headingText = this.extractText(node);

        const headingPath = updateHeadingStack(
          headingStack,
          node.depth,
          headingText,
        );

        sections.push(currentSection);
        currentSection = {
          heading: headingText,
          headingLevel: node.depth,
          headingPath: headingPath,
          blocks: [],
        };
      }

      if (node.type === "paragraph") {
        if (parent?.type === "listItem") {
          return;
        }

        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "paragraph",
          text: this.extractText(node),
        });
      }

      if (node.type === "code") {
        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "code",
          text: node.value,
        });
      }

      if (node.type === "list") {
        const items = node.children.map((item: any) => this.extractText(item));

        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "list",
          text: items.join("\n"),
        });
      }

      if (node.type === "table") {
        const rows = node.children.map((row: any) =>
          row.children.map((cell: any) => this.extractText(cell)).join(" | "),
        );

        currentSection.blocks.push({
          id: uuidv4(),
          index: blockIndex++,
          type: "table",
          text: rows.join("\n"),
        });
      }
    });

    sections.push(currentSection);

    return sections.filter(
      (section) => section.heading || section.blocks.length > 0,
    );
  }
}
