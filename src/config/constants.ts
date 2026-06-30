import { GoogleGenAI } from "@google/genai";
import { env } from "./env.js";

export const gemini = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const geminiLanguageModel = "gemini-2.5-flash";
export const geminiSingleEmbeddingModel = "gemini-embedding-2";
export const geminiListEmbeddingModel = "gemini-embedding-001";
