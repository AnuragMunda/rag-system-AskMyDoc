import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  GEMINI_API_KEY: z.string().min(1),

  CHROMA_URL: z.string().url().optional(),
  CHROMA_API_KEY: z.string().min(1).optional(),
  CHROMA_TENANT: z.string().min(1).optional(),
  CHROMA_DATABASE: z.string().min(1).optional(),
  CHROMA_HOST: z.string().min(1).optional(),

  APP_AUTH_USER: z.string().min(1).optional(),
  APP_AUTH_PASSWORD: z.string().min(1).optional(),

  STORAGE_DIR: z.string().min(1).default("storage/documents"),

  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(25 * 1024 * 1024),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export const env = envSchema
  .superRefine((value, ctx) => {
    if (!value.CHROMA_URL && !value.CHROMA_API_KEY) {
      ctx.addIssue({
        code: "custom",
        message: "Set CHROMA_URL or CHROMA_API_KEY",
        path: ["CHROMA_URL"],
      });
    }

    if (Boolean(value.APP_AUTH_USER) !== Boolean(value.APP_AUTH_PASSWORD)) {
      ctx.addIssue({
        code: "custom",
        message: "Set both APP_AUTH_USER and APP_AUTH_PASSWORD",
        path: ["APP_AUTH_USER"],
      });
    }
  })
  .parse(process.env);
