import { Client, SlashCommandBuilder } from "discord.js";
import { fetchAllForumThreads, processThreadsToDB } from "../index.ts";

export const fetchForumCommand = new SlashCommandBuilder()
  .setName("scrape-forum")
  .setDescription(
    "Manually scrapes the forum channel and processes new & old threads to the database"
  )
  .setDefaultMemberPermissions(0); // Restrict command to bot owners

const FORUM_CHANNEL_ID = "1156708804134703205"; //! fake servers forum channel id
export async function scrapeForum(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "scrape-forum"
    ) {
      try {
        const forumPosts = await fetchAllForumThreads(FORUM_CHANNEL_ID, client);
        const processedThreads = await processThreadsToDB(forumPosts);
        console.log(JSON.stringify(processedThreads, null, 2));
      } catch (error) {
        throw new Error(`Failed to fetch channel messages ${error}`);
      }
    }
  });
}
