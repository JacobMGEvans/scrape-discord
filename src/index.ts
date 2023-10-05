import fastify from "fastify";
import {
  Client,
  ChannelType,
  ForumChannel,
  GuildEmoji,
  Emoji,
  ReactionEmoji,
} from "discord.js";
import { Prisma, PrismaClient } from "@prisma/client";

const server = fastify();
const prisma = new PrismaClient();

const startServer = async () => {
  try {
    await server.listen({ port: 4321 });
    console.log(`Server listening on`, server.server.address());
  } catch (error) {
    console.error("Error starting server:", error);
  }
};
startServer();

server.get("/", async (_, reply) => {
  try {
    const forumPosts = await fetchChannelMessages("1156708804134703205");
    return JSON.stringify(forumPosts, null, 2);
  } catch (error) {
    reply.status(500);
    return { error: `Failed to fetch channel messages ${error}` };
  }
});

async function fetchChannelMessages(channelId: string) {
  try {
    const client = new Client({
      intents: ["Guilds", "GuildMessages"],
    });
    await client.login(process.env.DISCORD_TOKEN);

    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildForum)
      throw new Error("Channel not found");

    const forumChannel = (await channel?.toJSON()) as ForumChannel; // Wish they could type this themselves
    const threadIDs = forumChannel?.threads as unknown as string[]; // and had better typings

    const threads = await Promise.all(
      threadIDs.map(async (threadID) => {
        const thread = await channel?.threads.fetch(threadID);
        return thread;
      })
    );

    return await Promise.all(
      threads.map(async (thread) => {
        const messages = await thread?.messages.fetch();
        if (!thread?.id || !thread?.name || !thread?.ownerId) return;

        const forumPost = {
          id: thread.id,
          threadPostTitle: thread?.name,
          author: thread.ownerId,
          messages: messages?.map((m) => ({
            id: m.id,
            author: m.author.username,
            userID: m.author.id,
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
              userID: message.userID,
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

        const transactionQueries = [];
        transactionQueries.push(
          prisma.thread.upsert({
            create: threadData,
            update: threadData,
            where: { id: threadData.id },
          })
        );

        messageData.forEach((message) => {
          transactionQueries.push(
            prisma.message.upsert({
              create: message,
              update: message,
              where: { id: message.id },
            })
          );
        });

        emojiData.forEach((emoji) => {
          transactionQueries.push(
            prisma.emoji.upsert({
              create: emoji,
              update: emoji,
              where: { id: emoji.id },
            })
          );
        });

        imageData.forEach((image) => {
          transactionQueries.push(
            prisma.image.upsert({
              create: image,
              update: image,
              where: { id: image.id },
            })
          );
        });

        await prisma.$transaction(transactionQueries);

        return forumPost;
      })
    );
  } catch (error) {
    throw JSON.stringify(`Failed to fetch channel messages ${error}`, null, 2);
  }
}