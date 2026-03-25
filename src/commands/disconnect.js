// src/commands/disconnect.js
// Slash command: /disconnect
// Disconnects the Minecraft bot and disables auto-reconnect.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const botModule = require('../minecraft/bot');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the Minecraft bot and disable auto-reconnect'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!botModule.isConnected) {
      return interaction.reply({ content: '⚠️ Bot is already disconnected.', ephemeral: true });
    }

    botModule.disconnectBot();

    const msg = `🔌 Bot disconnected by ${interaction.user.tag}. Auto-reconnect disabled.`;
    await interaction.reply({ content: '✅ Bot disconnected. Auto-reconnect disabled.' });
    await logToChannel(msg);
    console.log(`[Disconnect] ${msg}`);
  },
};
