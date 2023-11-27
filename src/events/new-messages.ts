import { ChannelType, Client, Message } from "discord.js";
import { env } from "../helpers.ts";
import { fetchNewMessages } from "../controllers/fetches.ts";
import { processMessagesToDB } from "../controllers/processors.ts";

export async function handleMessageCreated(client: Client) {
  client.on("messageCreate", async (message) => {
    if (
      message.channel.type !== ChannelType.PublicThread ||
      message.channelId !== env.FORUM ||
      message.thread === null
    )
      return;

    const newMessages = await fetchNewMessages(message.thread);

    newMessages instanceof Message
      ? processMessagesToDB(newMessages)
      : new Error("Failed to fetch new messages in MessageCreate event");
  });
}
