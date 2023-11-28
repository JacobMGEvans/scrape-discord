import { Client, REST, Events, Routes, GatewayIntentBits } from "discord.js";
import { commands, slashCommands } from "./commands/index.ts";
import { listeners } from "./events/index.ts";
import { env } from "./helpers.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
});
const rest = new REST({ version: "10" }).setToken(env.TOKEN);

// Prepare the bot to connect to the server
client.once(Events.ClientReady, (c) => {
  console.log("Starting server...");
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

async function registerSlashCmds() {
  if (!env.CLIENT_ID || !env.SERVER_ID)
    throw new Error("Missing environment variables");
  // attempt to register slash commands
  try {
    await rest.put(
      Routes.applicationGuildCommands(env.CLIENT_ID, env.SERVER_ID),
      { body: commands }
    );
    console.log("All /slash commands registered successfully!");
  } catch (error) {
    console.error("ERROR:", error);
  }
}

await client.login(env.TOKEN);
await registerSlashCmds();
slashCommands(client);
listeners(client);
