import { ChannelType, Client } from "discord.js";
import { env } from "../helpers.ts";
import { processThreadsToDB } from "../controllers/processors.ts";

export async function handleThreadUpdated(client: Client) {
  client.on("threadUpdate", async (oldThread, newThread) => {
    if (
      newThread.parentId !== env.FORUM ||
      newThread.parent?.type !== ChannelType.GuildForum
    )
      return console.error("Thread not in Support forum");

    console.info(
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

    await processThreadsToDB([newThread]);
  });
}
