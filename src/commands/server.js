// src/commands/server.js
// Slash command: /server <ip> [port]
// Sets the Minecraft server IP and port for the bot to connect to.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { setServer, getServer } = require('../storage');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Set the Minecraft server IP and port')
    .addStringOption((opt) =>
      opt
        .setName('ip')
        .setDescription('The server IP or hostname (e.g., mc.example.net)')
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('port')
        .setDescription('The server port (default: 25565)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(65535)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const ip   = interaction.options.getString('ip');
    const port = interaction.options.getInteger('port') ?? 25565;

    setServer(ip, port);

    const msg = `🖥️ Server set to **${ip}:${port}** by ${interaction.user.tag}.`;
    await interaction.reply({ content: `✅ Server set to **${ip}:${port}**. Use \`/connect\` to connect.` });
    await logToChannel(msg);
    console.log(`[Server] ${msg}`);
  },
};
