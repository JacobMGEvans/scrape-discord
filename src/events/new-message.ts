// setup event listener for all new messages in forum channel

import { AnyThreadChannel, Client, Collection } from "discord.js";
import { isNewMessageInThread, env } from "../helpers.ts";
import { processMessagesToDB } from "../controllers/processors.ts";
// Listen to new message events
export async function threadUpdatedListener(client: Client) {
  client.on("threadUpdate", async (oldThread, newThread) => {
    if (newThread.messages.channel.parent?.name !== env.FORUM) return;
    console.log(
      "THREAD UPDATE EVENT",
      JSON.stringify(
        {
          oldThread,
          newThread,
        },
        null,
        2
      )
    );

    if (!isNewMessageInThread(oldThread, newThread)) return;

    const newMessages = await fetchNewMessages(newThread);

    newMessages instanceof Collection
      ? processMessagesToDB(newMessages)
      : new Error("Failed process new messages to DB");
  });
}

export async function fetchNewMessages(threadId: AnyThreadChannel<boolean>) {
  if (!threadId.lastMessageId) return;

  try {
    const messages = await threadId.messages.fetch({
      limit: 100,
      after: threadId.lastMessageId,
    });
    return messages;
  } catch (error) {
    return JSON.stringify(
      `Failed to fetch NEW channel messages ${error}`,
      null,
      2
    );
  }
}
