// src/commands/radius.js
// Slash command: /radius set <number>
// Sets the radius the Minecraft bot uses when looking for nearby players.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { setRadius, getRadius } = require('../storage');
const { logToChannel }         = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radius')
    .setDescription('Manage the whisper detection radius')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set the detection radius (in blocks)')
        .addIntegerOption((opt) =>
          opt
            .setName('number')
            .setDescription('Radius in blocks (1 – 512)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(512)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const value = interaction.options.getInteger('number', true);
      setRadius(value);

      const msg = `📡 Whisper radius updated to **${value} blocks** by ${interaction.user.tag}.`;
      await interaction.reply({ content: `✅ Radius set to **${value} blocks**.` });
      await logToChannel(msg);

      console.log(`[Radius] ${msg}`);
    }
  },
};
