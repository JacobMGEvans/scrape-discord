import { Client } from "discord.js";
import { handleThreadUpdated } from "./thread-updated.ts";
import { handleMessageCreated } from "./new-messages.ts";
import { handleMessageUpdate } from "./update-message.ts";

export function listeners(client: Client) {
  handleThreadUpdated(client);
  handleMessageCreated(client);
  handleMessageUpdate(client);
}
