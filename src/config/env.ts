import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),

  GEMINI_API_KEY: z.string(),

  CHROMA_URL: z.string(),
});

export const env = envSchema.parse(process.env);
