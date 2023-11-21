// setup event listener for all new messages in forum channel

import { Client, Collection } from "discord.js";
import { isNewMessageInThread, env } from "../helpers.ts";
import { processMessagesToDB } from "../controllers/processors.ts";
import { fetchNewMessages } from "../controllers/fetches.ts";

// Listen to new message events in forum channel
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
