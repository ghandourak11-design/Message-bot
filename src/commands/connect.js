// src/commands/connect.js
// Slash command: /connect
// Connects the Minecraft bot to the server and enables auto-reconnect.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const botModule = require('../minecraft/bot');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Connect the Minecraft bot to the server and enable auto-reconnect'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (botModule.isConnected) {
      return interaction.reply({ content: '⚠️ Bot is already connected.', ephemeral: true });
    }

    botModule.connectBot();

    const msg = `🔌 Bot connection initiated by ${interaction.user.tag}. Auto-reconnect enabled.`;
    await interaction.reply({ content: '✅ Connecting bot to server... Auto-reconnect enabled.' });
    await logToChannel(msg);
    console.log(`[Connect] ${msg}`);
  },
};
