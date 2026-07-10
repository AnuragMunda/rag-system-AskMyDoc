import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  GEMINI_API_KEY: z.string(),
  DATABASE_URL: z.string(),
  CHROMA_HOST: z.string(),
  CHROMA_API_KEY: z.string(),
  CHROMA_TENANT: z.string(),
  CHROMA_DATABASE: z.string(),
});

export const env = envSchema.parse(process.env);
