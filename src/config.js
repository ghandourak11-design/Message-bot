// src/config.js
// Loads and validates all required environment variables.
// Call this once at startup before using any config values.

'use strict';

require('dotenv').config();

const requiredVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'CHAT_CHANNEL_ID',
  'MINECRAFT_HOST',
  'MINECRAFT_USERNAME',
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    chatChannelId: process.env.CHAT_CHANNEL_ID,
  },
  minecraft: {
    host: process.env.MINECRAFT_HOST,
    port: parseInt(process.env.MINECRAFT_PORT || '25565', 10),
    username: process.env.MINECRAFT_USERNAME,
    password: process.env.MINECRAFT_PASSWORD || null,
  },
};
