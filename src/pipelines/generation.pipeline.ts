import { AnswerGenerator } from "@/llm/answer-generator.js";
import { PromptBuilder } from "@/llm/prompt-builder.js";
import { RetrievalService } from "@/retrieval/retrieval.service.js";
import { countTokens } from "@/chunking/tokeniser.js";
import {
  Citation,
  GeneratedAnswer,
  PromptContext,
} from "@/shared/types/generation.types.js";
import { extractPromptIds } from "@/shared/utils/helper.js";

export class GenerationPipeline {
  constructor(
    private readonly retrieval: RetrievalService,
    private readonly promptBuilder: PromptBuilder,
    private readonly answerGenerator: AnswerGenerator,
  ) {}

  /**
   * Runs the full generation pipeline: retrieve relevant chunks, build a
   * prompt context, generate an answer from the LLM, and extract inline
   * citations. Returns debug metrics for the UI panel.
   */
  async generateAnswer(query: string): Promise<GeneratedAnswer> {
    const retrieved = await this.retrieval.retrieve(query, { topK: 8 });

    const context = this.promptBuilder.buildContext(retrieved);
    const { prompt, contextTokens } = await this.promptBuilder.buildPrompt(
      query,
      context,
    );

    const answer = await this.answerGenerator.generate(prompt);

    const totalTokens = await countTokens(prompt);

    const citations = this.buildCitations(answer, context);

    return {
      answer,
      citations,
      retrievedChunks: retrieved,
      debug: {
        totalTokens,
        retrievedCount: retrieved.length,
        contextTokens,
      },
    };
  }

  private buildCitations(answer: string, context: PromptContext[]): Citation[] {
    const ids = extractPromptIds(answer);

    return ids.flatMap((id) => {
      const ctx = context.find((c) => c.id === id);

      if (!ctx) {
        return [];
      }

      return [
        {
          id,
          chunkId: ctx.retrievedChunk.chunkId,
          source: ctx.retrievedChunk.source,
          ...(ctx.retrievedChunk.pageNumber
            ? { pageNumber: ctx.retrievedChunk.pageNumber }
            : { headingPath: ctx.retrievedChunk.headingPath ?? [] }),
          blockIds: ctx.retrievedChunk.blockIds,
        },
      ];
    });
  }
}
