import fastify from "fastify";
import {
  Client,
  ChannelType,
  ForumChannel,
  AnyThreadChannel,
} from "discord.js";
import { Prisma, PrismaClient } from "@prisma/client";
import { isString } from "./helpers.ts";

const server = fastify();
const prisma = new PrismaClient();

const FORUM_CHANNEL_Id = "1156708804134703205"; //! fake servers forum channel id
const client = new Client({
  intents: ["Guilds", "GuildMessages"],
});
await client.login(process.env.DISCORD_TOKEN);

const startServer = async () => {
  try {
    await server.listen({ port: 4321 });
    console.log(`Server listening on`, server.server.address());
  } catch (error) {
    console.error("Error starting server:", error);
  }

  // Listen to new message events
  client.on("threadUpdate", async (oldThread, newThread) => {
    // check if thread messages are new or updated then update the DB
    // Not sure if this checking the cache will work
    if (oldThread.messages.cache.size !== newThread.messages.cache.size) {
      //!!!! Fetch the thread messages and store/update them in the DB
      await checkNewMessages(newThread);
    }
  });
};
startServer();

server.get("/manual-scrape", async (_, reply) => {
  try {
    const forumPosts = await fetchAllForumThreads(FORUM_CHANNEL_Id, client);
    return JSON.stringify(forumPosts, null, 2);
  } catch (error) {
    reply.status(500);
    return { error: `Failed to fetch channel messages ${error}` };
  }
});

/**
 * ! This function is not complete, it needs to be used up update the DB
 */
async function checkNewMessages(threadId: AnyThreadChannel<boolean>) {
  if (!threadId.lastMessageId) return;

  try {
    const messages = await threadId.messages.fetch({
      limit: 100,
      after: threadId.lastMessageId,
    });
    return messages;
  } catch (error) {
    return JSON.stringify(`Failed to fetch channel messages ${error}`, null, 2);
  }
}

async function fetchAllForumThreads(channelId: string, client: Client) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildForum)
      throw new Error("Channel not found");

    const forumChannel = (await channel?.toJSON()) as ForumChannel; // Wish they could type this themselves
    const threadIds = forumChannel?.threads as unknown as string[]; // and had better typings

    const threads = await Promise.all(
      threadIds.map(async (threadId) => {
        const thread = await channel?.threads.fetch(threadId);
        return thread;
      })
    );

    return await processThreadsToDBOperations(threads);
  } catch (error) {
    throw JSON.stringify(`Failed to fetch channel messages ${error}`, null, 2);
  }
}

async function processThreadsToDBOperations(
  threads: (AnyThreadChannel<boolean> | null)[]
) {
  const processedThreads = threads.filter(
    (thread) => thread !== null
  ) as AnyThreadChannel<boolean>[];

  return processedThreads.map(async (thread) => {
    if (!thread) return null;

    const messages = await thread.messages.fetch();
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

    const forumPost = {
      id: threadId,
      threadPostTitle: threadName,
      author: threadOwnerId,
      lastMessageId: String(lastMessageId),
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
      id: forumPost.id,
      threadPostTitle: forumPost.threadPostTitle,
      author: forumPost.author,
    });

    const messageData =
      forumPost.messages?.map((message) =>
        Prisma.validator<Prisma.MessageCreateManyInput>()({
          id: message.id,
          author: message.author,
          userId: message.userId,
          content: message.content,
          timestamp: message.timestamp,
          threadId: forumPost.id,
        })
      ) ?? [];

    const emojiData =
      forumPost.messages?.flatMap((message) =>
        message.emojis.map((emoji) => ({
          id: `${emoji.name}-${message.id}`,
          name: emoji.name,
          animated: emoji.animated ?? false,
          identifier: emoji.identifier,
          messageId: message.id,
        }))
      ) ?? [];

    const imageData =
      forumPost.messages?.flatMap((message) =>
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

    return await prisma.$transaction(transactionQueries);
  });
}
