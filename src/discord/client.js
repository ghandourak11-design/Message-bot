// src/discord/client.js
// Creates the Discord client, registers interaction handlers,
// applies per-user cooldowns, and exposes a helper to log to the
// configured channel.

'use strict';

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const config = require('../config');

// ─── Discord client ───────────────────────────────────────────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Commands are keyed by name and registered externally (see index.js).
client.commands = new Collection();

// Per-user cooldown tracker: userId → timestamp of last command use.
const cooldowns = new Map();
const COOLDOWN_MS = 3_000; // 3 seconds

// ─── Interaction handler ──────────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // ── Cooldown check ────────────────────────────────────────────────────────
  const now     = Date.now();
  const lastUse = cooldowns.get(interaction.user.id) ?? 0;
  const elapsed = now - lastUse;

  if (elapsed < COOLDOWN_MS) {
    const remaining = ((COOLDOWN_MS - elapsed) / 1000).toFixed(1);
    return interaction.reply({
      content: `⏳ Please wait **${remaining}s** before using another command.`,
      ephemeral: true,
    });
  }

  cooldowns.set(interaction.user.id, now);

  // ── Execute command ───────────────────────────────────────────────────────
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error('[Discord] Command error:', err);
    const msg = { content: '❌ An error occurred while executing that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ─── Channel logger ───────────────────────────────────────────────────────────

/**
 * Send a log message to the configured Discord channel.
 * Silently ignores errors so logging never crashes the bot.
 * @param {string} message  Plain-text message (may include Discord markdown).
 */
async function logToChannel(message) {
  try {
    const channel = await client.channels.fetch(config.discord.chatChannelId);
    if (channel?.isTextBased()) {
      await channel.send(message);
    }
  } catch {
    // Logging must never crash the bot.
  }
}

/**
 * Send an embed to the configured Discord channel.
 * Silently ignores errors so logging never crashes the bot.
 * @param {import('discord.js').EmbedBuilder} embed
 */
async function logEmbedToChannel(embed) {
  try {
    const channel = await client.channels.fetch(config.discord.chatChannelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch {
    // Logging must never crash the bot.
  }
}

module.exports = { client, logToChannel, logEmbedToChannel };
