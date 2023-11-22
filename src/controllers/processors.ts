import { AnyThreadChannel, Collection, Message } from "discord.js";
import { cooldown, isString } from "../helpers.ts";
import { Prisma, PrismaClient } from "@prisma/client";
import { fetchNewMessages } from "./fetches.ts";

const prisma = new PrismaClient();

export async function processThreadsToDB<
  Threads extends (AnyThreadChannel<boolean> | null)[]
>(threads: Threads) {
  const processedThreads = threads.filter(
    (thread): thread is AnyThreadChannel<boolean> => thread !== null
  );

  return processedThreads.map(async (thread) => {
    if (!thread) return null;

    const messages =
      (await fetchNewMessages(thread)) ?? (await thread.messages.fetch());

    const threadId = thread.id;
    const threadName = thread.name;
    const threadOwnerId = thread.ownerId;
    const lastMessageId = thread.lastMessageId;
    if (
      !isString(threadId) ||
      !isString(threadName) ||
      !isString(threadOwnerId) ||
      !isString(lastMessageId)
    )
      throw new Error("Failed to parse thread data");

    const forumThreadPost = {
      id: threadId,
      threadPostTitle: threadName,
      author: threadOwnerId,
      lastMessageId,
      messages: messages?.map((m) => ({
        id: m.id,
        author: m.author.username,
        userId: m.author.id,
        content: m.content,
        emojis: m.reactions.cache.map((r) => r.emoji),
        images: m.attachments.map((a) => a.url),
        timestamp: String(m.createdTimestamp),
      })),
    };

    const threadData = Prisma.validator<Prisma.ThreadCreateInput>()({
      id: forumThreadPost.id,
      threadPostTitle: forumThreadPost.threadPostTitle,
      author: forumThreadPost.author,
      lastMessageId,
    });

    const messageData =
      forumThreadPost.messages?.map((message) =>
        Prisma.validator<Prisma.MessageCreateManyInput>()({
          id: message.id,
          author: message.author,
          userId: message.userId,
          content: message.content,
          timestamp: message.timestamp,
          threadId: forumThreadPost.id,
        })
      ) ?? [];

    const emojiData =
      forumThreadPost.messages?.flatMap((message) =>
        message.emojis.map((emoji) => ({
          id: `${emoji.name}-${message.id}`,
          name: emoji.name,
          animated: emoji.animated ?? false,
          identifier: emoji.identifier,
          messageId: message.id,
        }))
      ) ?? [];

    const imageData =
      forumThreadPost.messages?.flatMap((message) =>
        message.images.map((url, index) => ({
          id: `${message.id}-image-#${index}`,
          url: url,
          messageId: message.id,
        }))
      ) ?? [];

    const transactionQueries = [
      prisma.thread.upsert({
        create: threadData,
        update: threadData,
        where: { id: threadData.id },
      }),
      ...messageData.map((message) =>
        prisma.message.upsert({
          create: message,
          update: message,
          where: { id: message.id },
        })
      ),
      ...emojiData.map((emoji) =>
        prisma.emoji.upsert({
          create: emoji,
          update: emoji,
          where: { id: emoji.id },
        })
      ),
      ...imageData.map((image) =>
        prisma.image.upsert({
          create: image,
          update: image,
          where: { id: image.id },
        })
      ),
    ];

    cooldown(500);
    return await prisma.$transaction(transactionQueries);
  });
}

export async function processMessagesToDB<
  Messages extends Collection<string, Message<true>>
>(messages: Messages) {
  if (!messages) return;

  for (const message of messages.values()) {
    const {
      id: messageId,
      author: { username: messageAuthor, id: messageUserId },
      content: messageContent,
      createdTimestamp,
      thread,
      attachments,
      reactions,
    } = message;
    const messageTimestamp = createdTimestamp.toString();
    const threadId = thread?.id;
    const messageImages = attachments.map((a) => a.url);
    const messageEmojis = reactions.cache.map((r) => r.emoji);

    if (!isString(threadId) || !thread)
      throw new Error("Failed to parse message data");

    const messageData = {
      id: messageId,
      author: messageAuthor,
      userId: messageUserId,
      content: messageContent,
      timestamp: messageTimestamp,
      threadId: threadId,
    };

    const emojiData = messageEmojis.map((emoji) => ({
      id: `${emoji.name}-${messageId}`,
      name: emoji.name,
      animated: emoji.animated ?? false,
      identifier: emoji.identifier,
      messageId: messageId,
    }));

    const imageData = messageImages.map((url, index) => ({
      id: `${messageId}-image-#${index}`,
      url: url,
      messageId: messageId,
    }));

    const transactionQueries = [
      prisma.message.upsert({
        create: messageData,
        update: messageData,
        where: { id: messageId },
      }),
      ...emojiData.map((emoji) =>
        prisma.emoji.upsert({
          create: emoji,
          update: emoji,
          where: { id: emoji.id },
        })
      ),
      ...imageData.map((image) =>
        prisma.image.upsert({
          create: image,
          update: image,
          where: { id: image.id },
        })
      ),
    ];

    cooldown(500);
    await prisma.$transaction(transactionQueries);
  }
}
