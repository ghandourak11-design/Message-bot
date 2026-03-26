// src/commands/deactivate.js
// Slash command: /deactivate
// Stops the random bot actions started by /active.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const botModule = require('../minecraft/bot');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deactivate')
    .setDescription('Stop the bot\'s random actions started by /active'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!botModule.isActive) {
      return interaction.reply({ content: '⚠️ Bot is not in active mode.', ephemeral: true });
    }

    botModule.stopActiveBehavior();

    const msg = `🛑 Active mode disabled by ${interaction.user.tag}.`;
    await interaction.reply({ content: '✅ Active mode **disabled**. Bot has stopped performing random actions.' });
    await logToChannel(msg);
    console.log(`[Deactivate] ${msg}`);
  },
};
