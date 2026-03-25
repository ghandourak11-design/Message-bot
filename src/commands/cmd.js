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

    if (!mcBot) {
      return interaction.reply({ content: '❌ Bot instance is not available.', ephemeral: true });
    }

    const cmdText = command.startsWith('/') ? command : `/${command}`;

    await interaction.deferReply();

    mcBot.chat(cmdText);

    // Collect server response messages for up to 5 seconds.
    const RESPONSE_TIMEOUT_MS = 5000;
    const collected = [];
    const handler = (msg) => { collected.push(msg); };
    mcBot.on('messagestr', handler);

    try {
      await new Promise((resolve) => setTimeout(resolve, RESPONSE_TIMEOUT_MS));
    } finally {
      mcBot.off('messagestr', handler);
    }

    const response = collected.length > 0 ? collected.join('\n') : 'No response';
    const msg = `⚙️ Command sent by ${interaction.user.tag}: \`${cmdText}\``;
    await interaction.editReply({
      content: `✅ **Command sent:** \`${cmdText}\`\n📨 **Server response:**\n\`\`\`\n${response}\n\`\`\``,
    });
    await logToChannel(msg);
    console.log(`[Cmd] ${msg}`);
  },
};
