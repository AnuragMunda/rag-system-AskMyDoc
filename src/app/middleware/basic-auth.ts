import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { env } from "@/config/env.js";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

function reject(res: Response): void {
  res.setHeader(
    "WWW-Authenticate",
    'Basic realm="Ask My Docs", charset="UTF-8"',
  );
  res.status(401).json({ error: "Unauthorized" });
}

export function basicAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expectedUser = env.APP_AUTH_USER;
  const expectedPassword = env.APP_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header) {
    reject(res);
    return;
  }

  const separator = header.indexOf(" ");
  if (separator === -1) {
    reject(res);
    return;
  }

  const scheme = header.slice(0, separator);
  const encoded = header.slice(separator + 1).trim();

  if (scheme.toLowerCase() !== "basic" || !encoded) {
    reject(res);
    return;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const credentialsSeparator = decoded.indexOf(":");

  if (credentialsSeparator === -1) {
    reject(res);
    return;
  }

  const user = decoded.slice(0, credentialsSeparator);
  const password = decoded.slice(credentialsSeparator + 1);

  const userMatches = safeEqual(user, expectedUser);
  const passwordMatches = safeEqual(password, expectedPassword);

  if (!userMatches || !passwordMatches) {
    reject(res);
    return;
  }

  next();
}
