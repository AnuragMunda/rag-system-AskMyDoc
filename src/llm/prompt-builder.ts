import { countTokens } from "@/chunking/tokeniser.js";
import { PromptContext } from "@/shared/types/generation.types.js";
import { RetrievedChunk } from "@/shared/types/retrieval.types.js";

export class PromptBuilder {
  private readonly maxContextTokens = 3500;

  buildContext(chunks: RetrievedChunk[]): PromptContext[] {
    return chunks.map((chunk, index) => ({
      id: `C${index + 1}`,
      retrievedChunk: chunk,
    }));
  }

  /** Builds the full prompt string from a query and context chunks. */
  async buildPrompt(query: string, context: PromptContext[]): Promise<{
    prompt: string;
    contextTokens: number;
  }> {
    const { context: serializedContext, totalTokens: contextTokens } =
      await this.serializeContext(context);

    const prompt = `
    You are a question-answering assistant.
    Answer ONLY using the provided context.
    If the answer cannot be found in the context, say:
    "I couldn't find enough information in the provided documents."
    For every claim, cite the chunk. Use ONLY the document identifiers provided below.

    Example:
    The paper argues ... [C1]

    Do not invent identifiers.

    CONTEXT:
    ${serializedContext}

    QUESTION:
    ${query}
    `;

    return { prompt, contextTokens };
  }

  /**
   * Serialises the retrieved chunks into a structured context block for the LLM,
   * respecting the max context token limit. Returns the serialised string and the
   * total token count of the context.
   */
  async serializeContext(context: PromptContext[]): Promise<{
    context: string;
    totalTokens: number;
  }> {
    const parts: string[] = [];

    let totalTokens = 0;

    for (const { id, retrievedChunk } of context) {
      const heading = retrievedChunk.headingPath?.join(" > ") ?? "Unknown";

      const section = `
      [${id}]
      Source: ${retrievedChunk.source}
      ${retrievedChunk.pageNumber !== 0 ? `Page: ${retrievedChunk.pageNumber}` : `Heading: ${heading}`}

      CONTENT:
      ${retrievedChunk.content}
      `;

      const sectionTokens = await countTokens(section);

      if (totalTokens + sectionTokens > this.maxContextTokens) {
        break;
      }

      parts.push(section);

      totalTokens += sectionTokens;
    }

    return { context: parts.join("\n\n"), totalTokens };
  }
}
