import { Client, SlashCommandBuilder } from "discord.js";
import { fetchAllForumThreads, processThreadsToDB } from "../index.ts";
import { env } from "../helpers.ts";

export const fetchForumCommand = new SlashCommandBuilder()
  .setName("scrape-forum")
  .setDescription(
    "Manually scrapes the forum channel and processes new & old threads to the database"
  )
  .setDefaultMemberPermissions(0); // Restrict command to bot owners

export async function scrapeForum(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "scrape-forum"
    ) {
      try {
        const forumPosts = await fetchAllForumThreads(env.FORUM, client);
        const processedThreads = await processThreadsToDB(forumPosts);
        console.log(JSON.stringify(processedThreads, null, 2));
      } catch (error) {
        throw new Error(`Failed to fetch channel messages ${error}`);
      }
    }
  });
}
