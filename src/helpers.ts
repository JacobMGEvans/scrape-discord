import { PrismaClient } from "@prisma/client";
import { z } from "zod";

import type { AnyThreadChannel, Message } from "discord.js";

export const prisma = new PrismaClient();

export async function cooldown(ms: number) {
  // Block the event loop for the specified amount of time
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

const NullableUndefined = z.union([z.null(), z.undefined()]);
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return NullableUndefined.safeParse(value).success;
}

export function isNewMessageInThread(
  oldThread: AnyThreadChannel<boolean>,
  newThread: AnyThreadChannel<boolean>
): boolean {
  if (
    oldThread.messages.cache.size !== newThread.messages.cache.size ||
    oldThread.lastMessageId !== newThread.lastMessageId
  )
    return true;

  return false;
}

const envSchema = z.object({
  TOKEN: z.string(),
  FORUM: z.string(),
  SERVER_ID: z.string(),
  CLIENT_ID: z.string(),
  DATABASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2)
  );
  process.exit(1);
}

export const env = parsed.data;
