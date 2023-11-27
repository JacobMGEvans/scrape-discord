import { ChannelType, Client, Collection, Message } from "discord.js";
import { env } from "../helpers.ts";
import { fetchNewMessages } from "../controllers/fetches.ts";
import { processMessagesToDB } from "../controllers/processors.ts";

export async function handleMessageCreated(client: Client) {
  client.on("messageCreate", async (message) => {
    if (
      //@ts-expect-error - This is a GuildForumChannel
      message.channel.parent.type !== ChannelType.GuildForum ||
      //@ts-expect-error - This is a GuildForumChannel
      message.channel.parent.id !== env.FORUM
    )
      return console.error("Message not in Support forum");

    // Make the message a Collection of one message so we can reuse the processMessagesToDB function
    const messageCollection = new Collection<string, Message<boolean>>();
    messageCollection.set(message.id, message);

    const processedMessage =
      (await processMessagesToDB(messageCollection)) ??
      new Error("Failed to fetch new messages in MessageCreate event");

    console.log(JSON.stringify(processedMessage, null, 2));
  });
}
