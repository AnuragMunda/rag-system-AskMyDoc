import { geminiLanguageModel } from "@/config/constants.js";
import { GoogleGenAI } from "@google/genai";

export class AnswerGenerator {
  constructor(private readonly client: GoogleGenAI) {}

  async generate(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: geminiLanguageModel,
      contents: prompt,
      config: { temperature: 0 },
    });

    return response.text ?? "";
  }
}
