import { ChannelType, Client } from "discord.js";
import { env, isNewMessageInThread } from "../helpers.ts";
import { processThreadsToDB } from "../controllers/processors.ts";

export async function handleThreadUpdated(client: Client) {
  client.on("threadUpdate", async (oldThread, newThread) => {
    if (
      newThread.type !== ChannelType.PublicThread ||
      newThread.id !== env.FORUM
    )
      return;
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

    if (!isNewMessageInThread(oldThread, newThread)) {
      // If the thread was updated but no new messages were added only update thread data in DB
      console.log("THREAD UPDATED BUT NO NEW MESSAGES");
      await processThreadsToDB([newThread]);
    }
  });
}
