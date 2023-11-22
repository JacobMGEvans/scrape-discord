import { AnyThreadChannel, ForumChannel } from "discord.js";
import { cooldown } from "../helpers.ts";
import { Client } from "discord.js";
import { ChannelType } from "discord.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * !!! Refactor either this or processThreadsToDB to handle new Messages from all threads and not scrape all messages from all threads every time.
 */
export async function fetchAllForumThreads(channelId: string, client: Client) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildForum)
      throw new Error("Channel not found");

    const forumChannel = (await channel?.toJSON()) as ForumChannel; // Wish they could type this themselves
    const threadIds = forumChannel?.threads as unknown as string[]; // and had better typings

    const threads = await Promise.all(
      threadIds.map(async (threadId) => {
        cooldown(500);
        const thread = await channel?.threads.fetch(threadId);
        return thread;
      })
    );

    return threads;
  } catch (error) {
    throw JSON.stringify(`Failed to fetch channel messages ${error}`, null, 2);
  }
}

export async function fetchNewMessages(thread: AnyThreadChannel<boolean>) {
  const lastMessageInDB = await prisma.thread
    .findUnique({
      where: {
        id: thread.id,
      },
      select: {
        lastMessageId: true,
      },
    })
    .then((res) => res?.lastMessageId);
  if (lastMessageInDB === null) return;

  try {
    const messages = await thread.messages.fetch({
      limit: 100,
      after: lastMessageInDB,
    });
    return messages;
  } catch (error) {
    throw new Error(
      JSON.stringify(`Failed to fetch NEW channel messages ${error}`, null, 2)
    );
  }
}
