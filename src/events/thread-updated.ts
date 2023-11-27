import { ChannelType, Client } from "discord.js";
import { env, isNewMessageInThread } from "../helpers.ts";
import { processThreadsToDB } from "../controllers/processors.ts";

export async function handleThreadUpdated(client: Client) {
  client.on("threadUpdate", async (oldThread, newThread) => {
    if (
      newThread.parentId !== env.FORUM ||
      newThread.parent?.type !== ChannelType.GuildForum
    )
      return console.error("Thread not in Support forum");

    console.log(
      "THREAD UPDATE EVENT",
      JSON.stringify(
        {
          "***OLDTHREAD***": oldThread,
          "***NEWTHREAD***": newThread,
        },
        null,
        2
      )
    );

    if (!isNewMessageInThread(oldThread, newThread)) {
      // If the thread was updated but no new messages were added only update thread data in DB
      console.log("THREAD UPDATED BUT NO NEW MESSAGES");
      await processThreadsToDB([newThread]);
    }
  });
}
