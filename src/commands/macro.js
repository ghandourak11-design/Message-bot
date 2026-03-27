// src/commands/macro.js
// Slash commands:
//   /macro start <text>   – repeatedly sends <text> in Minecraft chat at the configured timer interval
//   /macro stop            – stops the macro

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const botModule = require('../minecraft/bot');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('macro')
    .setDescription('Spam a message or command in Minecraft chat')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start spamming a message or command')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('The message or command to repeat (e.g., /say hello)')
            .setRequired(true)
            .setMaxLength(256)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('stop').setDescription('Stop the current macro')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── /macro start ──────────────────────────────────────────────────────────
    if (sub === 'start') {
      if (!botModule.isConnected) {
        return interaction.reply({ content: '❌ Bot is not connected to the server.', ephemeral: true });
      }

      const text = interaction.options.getString('text', true).trim();

      botModule.startMacro(text);

      const msg = `🔁 Macro started by ${interaction.user.tag}: \`${text}\``;
      await interaction.reply({ content: `✅ Macro **started** – repeating: \`${text}\`` });
      await logToChannel(msg);
      console.log(`[Macro] ${msg}`);
      return;
    }

    // ── /macro stop ───────────────────────────────────────────────────────────
    if (sub === 'stop') {
      if (!botModule.isMacroRunning) {
        return interaction.reply({ content: '⚠️ No macro is currently running.', ephemeral: true });
      }

      botModule.stopMacro();

      const msg = `🛑 Macro stopped by ${interaction.user.tag}.`;
      await interaction.reply({ content: '✅ Macro **stopped**.' });
      await logToChannel(msg);
      console.log(`[Macro] ${msg}`);
    }
  },
};
