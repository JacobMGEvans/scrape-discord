import { ChannelType, Client } from "discord.js";
import { env } from "../helpers.ts";

export function handleMessageCreated(client: Client) {
  client.on("messageCreate", async (message) => {
    if (
      message.channel.type !== ChannelType.PublicThread &&
      message.channelId !== env.FORUM
    )
      return;

    console.log("NEW MESSAGE EVENT", JSON.stringify(message, null, 2));
  });
}
