// register-commands.js
// One-time script to deploy slash commands to Discord.
// Run with: node register-commands.js
//
// This registers commands globally (available in all guilds after ~1 hour)
// or to a specific guild for instant updates (set DISCORD_GUILD_ID in .env).

'use strict';

require('dotenv').config();
const { REST, Routes } = require('discord.js');

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId  = process.env.DISCORD_GUILD_ID; // optional

if (!token || !clientId) {
  console.error('[Register] DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [
  require('./src/commands/radius').data.toJSON(),
  require('./src/commands/message').data.toJSON(),
  require('./src/commands/connect').data.toJSON(),
  require('./src/commands/disconnect').data.toJSON(),
  require('./src/commands/cmd').data.toJSON(),
  require('./src/commands/server').data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('[Register] Registering slash commands…');

    if (guildId) {
      // Guild-scoped registration: instant, good for development.
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`[Register] ✅ Commands registered to guild ${guildId}.`);
    } else {
      // Global registration: takes up to 1 hour to propagate.
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('[Register] ✅ Commands registered globally (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('[Register] Failed to register commands:', err);
    process.exit(1);
  }
})();
