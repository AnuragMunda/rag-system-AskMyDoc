import { gemini, geminiLanguageModel } from "@/config/constants.js";

// Calculate the token count for a given content
export const countTokens = async (text: string) => {
  const { totalTokens } = await gemini.models.countTokens({
    model: geminiLanguageModel,
    contents: text,
  });

  if (!totalTokens) {
    throw new Error("No tokens found");
  }
  return totalTokens;
};
