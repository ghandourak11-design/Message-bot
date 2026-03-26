// index.js
// Entry point – starts the Discord bot and the Minecraft bot.

'use strict';

// Load environment variables and validate config first.
const config = require('./src/config');

const { REST, Routes }         = require('discord.js');
const { client, logToChannel } = require('./src/discord/client');
const { createBot }            = require('./src/minecraft/bot');

// ─── Load slash commands ──────────────────────────────────────────────────────

const radiusCommand     = require('./src/commands/radius');
const messageCommand    = require('./src/commands/message');
const connectCommand    = require('./src/commands/connect');
const disconnectCommand = require('./src/commands/disconnect');
const cmdCommand        = require('./src/commands/cmd');
const serverCommand     = require('./src/commands/server');
const activeCommand     = require('./src/commands/active');
const deactivateCommand = require('./src/commands/deactivate');

client.commands.set(radiusCommand.data.name,     radiusCommand);
client.commands.set(messageCommand.data.name,    messageCommand);
client.commands.set(connectCommand.data.name,    connectCommand);
client.commands.set(disconnectCommand.data.name, disconnectCommand);
client.commands.set(cmdCommand.data.name,        cmdCommand);
client.commands.set(serverCommand.data.name,     serverCommand);
client.commands.set(activeCommand.data.name,     activeCommand);
client.commands.set(deactivateCommand.data.name, deactivateCommand);

// ─── Discord ready ────────────────────────────────────────────────────────────

client.once('ready', async () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  logToChannel(`🤖 Discord bot **${client.user.tag}** is online and ready.`);

  // ─── Register slash commands ──────────────────────────────────────────────
  try {
    const commands = [
      radiusCommand.data.toJSON(),
      messageCommand.data.toJSON(),
      connectCommand.data.toJSON(),
      disconnectCommand.data.toJSON(),
      cmdCommand.data.toJSON(),
      serverCommand.data.toJSON(),
      activeCommand.data.toJSON(),
      deactivateCommand.data.toJSON(),
    ];

    const rest     = new REST({ version: '10' }).setToken(config.discord.token);
    const clientId = config.discord.clientId;
    const guildId  = config.discord.guildId;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`[Discord] ✅ Slash commands registered to guild ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('[Discord] ✅ Slash commands registered globally (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('[Discord] Failed to register slash commands:', err);
  }

  // Start the Minecraft bot once Discord is ready so logging works immediately.
  createBot();
});

// ─── Unhandled rejections ─────────────────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  console.error('[Process] Unhandled rejection:', err);
});

// ─── Start ────────────────────────────────────────────────────────────────────

client.login(config.discord.token);
