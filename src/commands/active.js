// src/commands/active.js
// Slash command: /active
// Starts random bot actions (jumps, circle-walking, arm swings) until /deactivate is used.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const botModule = require('../minecraft/bot');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('active')
    .setDescription('Make the bot perform random actions (jumps, circles, hits)'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!botModule.isConnected) {
      return interaction.reply({ content: '❌ Bot is not connected to the server.', ephemeral: true });
    }

    if (botModule.isActive) {
      return interaction.reply({ content: '⚠️ Bot is already in active mode. Use `/deactivate` to stop.', ephemeral: true });
    }

    botModule.startActiveBehavior();

    const msg = `🏃 Active mode enabled by ${interaction.user.tag}. Bot will jump, walk in circles, and swing randomly.`;
    await interaction.reply({ content: '✅ Active mode **enabled**! The bot will now perform random actions. Use `/deactivate` to stop.' });
    await logToChannel(msg);
    console.log(`[Active] ${msg}`);
  },
};
