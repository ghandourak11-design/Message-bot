// src/commands/cmd.js
// Slash command: /cmd <command>
// Sends a command or chat message to the Minecraft server.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { sendCommand }         = require('../minecraft/bot');
const { logToChannel }        = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cmd')
    .setDescription('Execute a command on the Minecraft server')
    .addStringOption((opt) =>
      opt
        .setName('command')
        .setDescription('The command to run (e.g. /tp PlayerName or /give PlayerName stone 64)')
        .setRequired(true)
        .setMaxLength(256)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const command = interaction.options.getString('command', true);
    const sent = sendCommand(command);

    if (sent) {
      const msg = `🎮 Command sent: \`${command}\``;
      logToChannel(msg);
      await interaction.reply({ content: msg, ephemeral: false });
    } else {
      await interaction.reply({
        content: '❌ The Minecraft bot is not currently connected. Use `/connect` first.',
        ephemeral: true,
      });
    }
  },
};
