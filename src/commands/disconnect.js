// src/commands/disconnect.js
// Slash command: /disconnect
// Disconnects the Minecraft bot from the server and disables auto-reconnect.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { disconnectBot, getIsConnected } = require('../minecraft/bot');
const { logToChannel }        = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the Minecraft bot from the server and disable auto-reconnect'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!getIsConnected()) {
      await interaction.reply({ content: '⚠️ The Minecraft bot is not currently connected.', ephemeral: true });
      return;
    }
    disconnectBot();
    const msg = '🔌 Disconnecting from the Minecraft server. Auto-reconnect **disabled**.';
    logToChannel(msg);
    await interaction.reply({ content: msg, ephemeral: false });
  },
};
