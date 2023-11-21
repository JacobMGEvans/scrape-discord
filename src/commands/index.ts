import { Client } from "discord.js";
import { scrapeForum, fetchForumCommand } from "./scrape-forum.ts";

export const slashCommands = (client: Client): void => {
  scrapeForum(client);
};

export const commands = [fetchForumCommand];
