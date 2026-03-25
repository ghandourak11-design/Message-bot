// src/commands/connect.js
// Slash command: /connect
// Connects the Minecraft bot to the server and enables auto-reconnect.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { connectBot, getIsConnected } = require('../minecraft/bot');
const { logToChannel }        = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Connect the Minecraft bot to the server and enable auto-reconnect'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (getIsConnected()) {
      await interaction.reply({ content: '✅ The Minecraft bot is already connected.', ephemeral: true });
      return;
    }
    connectBot();
    const msg = '🔗 Connecting to the Minecraft server with auto-reconnect **enabled**.';
    logToChannel(msg);
    await interaction.reply({ content: msg, ephemeral: false });
  },
};
