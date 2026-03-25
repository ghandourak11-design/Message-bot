// src/commands/cmd.js
// Slash command: /cmd <command>
// Executes a command on the Minecraft server via the bot.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const botModule = require('../minecraft/bot');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cmd')
    .setDescription('Execute a command on the Minecraft server')
    .addStringOption((opt) =>
      opt
        .setName('command')
        .setDescription('The command to run (e.g., /tp player 0 64 0)')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!botModule.isConnected) {
      return interaction.reply({ content: '❌ Bot is not connected to the server.', ephemeral: true });
    }

    const command = interaction.options.getString('command', true);
    const mcBot   = botModule.getBot();

    mcBot.chat(command);

    const msg = `⚙️ Command sent by ${interaction.user.tag}: \`${command}\``;
    await interaction.reply({ content: `✅ Command sent: \`${command}\`` });
    await logToChannel(msg);
    console.log(`[Cmd] ${msg}`);
  },
};
