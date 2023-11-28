import { ChannelType, Client } from "discord.js";
import { env, prisma } from "../helpers.ts";

export async function handleMessageUpdate(client: Client) {
  client.on("messageUpdate", async (message) => {
    if (
      //@ts-expect-error - This is a GuildForumChannel
      message.channel.parent.type !== ChannelType.GuildForum ||
      //@ts-expect-error - This is a GuildForumChannel
      message.channel.parent.id !== env.FORUM
    )
      return console.error("Updated Message not in Support forum");

    if (message.partial)
      return console.error("Message is partial - Likely User Deleted Message");

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

    console.info(
      "MESSAGE UPDATE EVENT",
      JSON.stringify(
        {
          "***MESSAGE***": message,
          "***IMAGE DATA***": imageData,
          "***EMOJI DATA***": emojiData,
        },
        null,
        2
      )
    );

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
      },
    });

    await prisma.emoji.updateMany({
      where: { messageId: message.id },
      data: emojiData,
    });

    console.log("MESSAGE CREATED:", JSON.stringify(processedMessage, null, 2));
  });
}
