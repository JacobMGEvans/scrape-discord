import { cooldown, isNullOrUndefined, prisma } from "../helpers.ts";
import { Client, ChannelType } from "discord.js";

import type {
  AnyThreadChannel,
  Collection,
  ForumChannel,
  Message,
} from "discord.js";

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

export async function fetchNewMessages(
  thread: AnyThreadChannel<boolean>
): Promise<Collection<string, Message<true>> | undefined> {
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

  if (isNullOrUndefined(lastMessageInDB)) return;

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
