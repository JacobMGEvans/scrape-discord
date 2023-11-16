import { AnyThreadChannel, Message } from "discord.js";

/**
 * !! IF I MAKE MORE THAN ONE OF THESE TYPE HELPERS I AM INSTALLING ZOD
 */
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
