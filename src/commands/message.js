// src/commands/message.js
// Slash commands:
//   /message add <text>
//   /message remove <text or id>
//   /message list

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { addMessage, removeMessage, getMessages } = require('../storage');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('Manage the pool of random whisper messages')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a new whisper message')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('The message text to add')
            .setRequired(true)
            .setMaxLength(256)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a whisper message by its exact text or list number')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('Exact message text or the number shown in /message list')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Show all current whisper messages')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── /message add ─────────────────────────────────────────────────────────
    if (sub === 'add') {
      const text = interaction.options.getString('text', true).trim();

      if (!text) {
        return interaction.reply({ content: '❌ Message text cannot be empty.', ephemeral: true });
      }

      const added = addMessage(text);
      if (!added) {
        return interaction.reply({
          content: '⚠️ That message already exists in the pool.',
          ephemeral: true,
        });
      }

      const msg = `➕ Message added by ${interaction.user.tag}: \`${text}\``;
      await interaction.reply({ content: `✅ Message added: \`${text}\`` });
      await logToChannel(msg);
      console.log(`[Messages] ${msg}`);
      return;
    }

    // ── /message remove ───────────────────────────────────────────────────────
    if (sub === 'remove') {
      const query   = interaction.options.getString('text', true).trim();
      const removed = removeMessage(query);

      if (!removed) {
        return interaction.reply({
          content: '❌ No message found matching that text or index.',
          ephemeral: true,
        });
      }

      const msg = `➖ Message removed by ${interaction.user.tag}: \`${removed}\``;
      await interaction.reply({ content: `✅ Message removed: \`${removed}\`` });
      await logToChannel(msg);
      console.log(`[Messages] ${msg}`);
      return;
    }

    // ── /message list ─────────────────────────────────────────────────────────
    if (sub === 'list') {
      const messages = getMessages();

      if (messages.length === 0) {
        return interaction.reply({
          content: '📭 The whisper message pool is currently empty.',
          ephemeral: true,
        });
      }

      const formatted = messages
        .map((m, i) => `**${i + 1}.** ${m}`)
        .join('\n');

      // Discord messages are capped at 2000 chars; truncate gracefully.
      const content =
        `📋 **Whisper Messages (${messages.length})**\n\n` +
        (formatted.length > 1800 ? formatted.slice(0, 1800) + '\n…(truncated)' : formatted);

      return interaction.reply({ content, ephemeral: true });
    }
  },
};
