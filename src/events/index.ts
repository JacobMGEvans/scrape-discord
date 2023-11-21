import { Client } from "discord.js";
import { threadUpdatedListener } from "./new-message.ts";

export function listeners(client: Client) {
  threadUpdatedListener(client);
}
