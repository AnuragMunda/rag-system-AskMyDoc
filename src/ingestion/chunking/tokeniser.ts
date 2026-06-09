import { env } from "@/config/env.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({apiKey: env.GEMINI_API_KEY});

// Calculate the token count for a given content
export const countTokens = async (text: string) => {
  const { totalTokens } = await ai.models.countTokens({
    model: "gemini-3.5-flash",
    contents: text,
  });

  if (!totalTokens) {
    throw new Error("No tokens found");
  }
  return totalTokens;
};
