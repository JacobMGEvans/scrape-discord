import { ChannelType, Client, Collection, Message } from "discord.js";
import { env, prisma } from "../helpers.ts";

export async function handleMessageCreated(client: Client) {
  client.on("messageCreate", async (message) => {
    if (
      //@ts-expect-error - This is a GuildForumChannel
      message.channel.parent.type !== ChannelType.GuildForum ||
      //@ts-expect-error - This is a GuildForumChannel
      message.channel.parent.id !== env.FORUM
    )
      return console.error("Message not in Support forum");

    const imageData = message.attachments.map((attachment, index) => ({
      id: `${message.id}-image-#${index}`,
      url: attachment.url,
      messageId: message.id,
    }));

    const emojiData = message.reactions.cache.map((reaction) => ({
      id: `${reaction.emoji.name}-${message.id}`,
      name: reaction.emoji.name,
      animated: reaction.emoji.animated ?? false,
      identifier: reaction.emoji.identifier,
      messageId: message.id,
    }));

    const processedMessage = await prisma.message.create({
      data: {
        id: message.id,
        author: message.author.username,
        userId: message.author.id,
        content: message.content,
        timestamp: message.createdTimestamp.toString(),
        threadId: message.channelId,
        images: {
          create: imageData,
        },
        emojis: {
          create: emojiData,
        },
      },
    });

    console.log("MESSAGE CREATED:", JSON.stringify(processedMessage, null, 2));
  });
}
