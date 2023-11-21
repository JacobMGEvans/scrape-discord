import { Client, SlashCommandBuilder } from "discord.js";
import { scrapeForum, fetchForumCommand } from "./scrape-forum.ts";

export function slashCommands(client: Client) {
  scrapeForum(client);
}

export const commands: SlashCommandBuilder[] = [fetchForumCommand];
