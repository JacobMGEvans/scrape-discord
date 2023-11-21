import { AnyThreadChannel, Message } from "discord.js";
import { z } from "zod";

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNewMessage(message: Message): boolean {
  if (!message.thread || !message.thread.lastMessageId) return false;
  return message.id > message.thread.lastMessageId;
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
