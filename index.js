// index.js
// Entry point – starts the Discord bot and the Minecraft bot.

'use strict';

// Load environment variables and validate config first.
const config = require('./src/config');

const { client, logToChannel } = require('./src/discord/client');
const { createBot }            = require('./src/minecraft/bot');

// ─── Load slash commands ──────────────────────────────────────────────────────

const radiusCommand  = require('./src/commands/radius');
const messageCommand = require('./src/commands/message');

client.commands.set(radiusCommand.data.name,  radiusCommand);
client.commands.set(messageCommand.data.name, messageCommand);

// ─── Discord ready ────────────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
  logToChannel(`🤖 Discord bot **${client.user.tag}** is online and ready.`);

  // Start the Minecraft bot once Discord is ready so logging works immediately.
  createBot();
});

// ─── Unhandled rejections ─────────────────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  console.error('[Process] Unhandled rejection:', err);
});

// ─── Start ────────────────────────────────────────────────────────────────────

client.login(config.discord.token);
