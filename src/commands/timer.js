// src/commands/timer.js
// Slash command: /timer set <seconds>
// Sets the delay (in seconds) between macro messages or commands.

'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { setMacroDelay, getMacroDelay } = require('../storage');
const { logToChannel } = require('../discord/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timer')
    .setDescription('Manage the delay between macro messages')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set the delay between macro messages (in seconds)')
        .addIntegerOption((opt) =>
          opt
            .setName('seconds')
            .setDescription('Delay in seconds (1 – 300)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(300)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const value = interaction.options.getInteger('seconds', true);
      setMacroDelay(value);

      const msg = `⏱️ Macro delay updated to **${value}s** by ${interaction.user.tag}.`;
      await interaction.reply({ content: `✅ Macro delay set to **${value} seconds**.` });
      await logToChannel(msg);
      console.log(`[Timer] ${msg}`);
    }
  },
};
