// src/minecraft/bot.js
// Manages the mineflayer Minecraft bot:
//   – connects to DonutSMP
//   – automatically whispers random nearby players
//   – respects the configurable radius
//   – has anti-spam protections (delay between whispers, cooldown per player)
//   – handles disconnects with automatic reconnection

'use strict';

const mineflayer     = require('mineflayer');
const { EmbedBuilder } = require('discord.js');
const config         = require('../config');
const { getRadius, getMessages } = require('../storage');
const { logToChannel, logEmbedToChannel } = require('../discord/client');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Milliseconds between each whisper attempt. */
const WHISPER_INTERVAL_MS = 15_000; // 15 seconds

/** How long (ms) before the same player can be whispered again. */
const PER_PLAYER_COOLDOWN_MS = 60_000; // 1 minute

// ─── State ────────────────────────────────────────────────────────────────────

let bot            = null;
let whisperTimer   = null;
let isConnected    = false;
let reconnectTimeout = null;

/** When true the bot will attempt to reconnect after a disconnect/kick. */
let autoReconnect  = true;

/** Map of playerName → timestamp of last whisper sent. */
const lastWhispered = new Map();

// ─── Helper utilities ─────────────────────────────────────────────────────────

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T|null}
 */
function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Return the 3D distance between two {x,y,z} positions.
 * @param {{ x:number, y:number, z:number }} a
 * @param {{ x:number, y:number, z:number }} b
 * @returns {number}
 */
function distance(a, b) {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2
  );
}

// ─── Whisper loop ─────────────────────────────────────────────────────────────

/**
 * Run one whisper tick:
 *   1. Find all players within the current radius (excluding the bot itself).
 *   2. Filter out players whispered recently.
 *   3. Pick one at random and send a whisper.
 */
function whisperTick() {
  if (!isConnected || !bot) return;

  const messages = getMessages();
  if (messages.length === 0) {
    console.log('[Bot] No whisper messages configured – skipping tick.');
    return;
  }

  const radius = getRadius();
  const botPos = bot.entity?.position;
  if (!botPos) return;

  const now = Date.now();

  // Build candidate list: nearby players not on cooldown, not the bot itself.
  const candidates = Object.values(bot.players).filter((p) => {
    if (!p.entity) return false;                   // player not loaded / out of render
    if (p.username === bot.username) return false; // skip self

    const dist = distance(botPos, p.entity.position);
    if (dist > radius) return false;               // outside radius

    const lastTime = lastWhispered.get(p.username) ?? 0;
    if (now - lastTime < PER_PLAYER_COOLDOWN_MS) return false; // on cooldown

    return true;
  });

  if (candidates.length === 0) {
    console.log('[Bot] No eligible players to whisper this tick.');
    return;
  }

  const target  = pickRandom(candidates);
  const message = pickRandom(messages);

  // Send the whisper as a Minecraft command.
  bot.chat(`/msg ${target.username} ${message}`);
  lastWhispered.set(target.username, now);

  const log = `💬 You messaged **${target.username}**: "${message}"`;
  console.log(`[Bot] ${log}`);
  logToChannel(log);
}

// ─── Bot creation ─────────────────────────────────────────────────────────────

/**
 * Create and wire up a new mineflayer bot instance.
 * Call this once at startup; it will reconnect automatically on disconnect.
 */
function createBot() {
  // Clean up any pending reconnect timer.
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clean up the old bot instance before creating a new one.
  if (bot) {
    try { bot.quit(); } catch (_) {}
    bot = null;
  }

  console.log(`[Bot] Connecting to ${config.minecraft.host}:${config.minecraft.port} via Microsoft auth…`);

  bot = mineflayer.createBot({
    host: config.minecraft.host,
    port: config.minecraft.port,
    auth: 'microsoft',
    version: '1.21.1',
    viewDistance: 1,
    onMsaCode(data) {
      const embed = new EmbedBuilder()
        .setTitle('🔐 Microsoft Auth Required')
        .setColor(0x0078d4)
        .setDescription(
          `Go to: ${data.verification_uri}\nEnter code: \`${data.user_code}\`\nExpires in ${Math.floor(data.expires_in / 60)} minutes.`
        );
      console.log(`[Bot] Microsoft auth required – code: ${data.user_code}  url: ${data.verification_uri}`);
      logEmbedToChannel(embed);
    },
  });

  // ── Connected ──────────────────────────────────────────────────────────────
  bot.once('spawn', () => {
    isConnected = true;
    console.log('[Bot] Connected to the server.');
    logToChannel(`✅ Minecraft bot **${bot.username}** connected to **${config.minecraft.host}**.`);

    // Start the whisper loop.
    if (whisperTimer) clearInterval(whisperTimer);
    whisperTimer = setInterval(whisperTick, WHISPER_INTERVAL_MS);
  });

  // ── Chat messages ─────────────────────────────────────────────────────────
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    if (!text || !text.trim()) return; // skip empty messages

    console.log(`[Bot] Chat: ${text}`);
    logToChannel(`**[MC Chat]** ${text}`);
  });

  // ── Kicked ────────────────────────────────────────────────────────────────
  bot.on('kicked', (reason) => {
    isConnected = false;
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);
    const msg = `⚠️ Minecraft bot was kicked: ${reasonStr}`;
    console.warn(`[Bot] ${msg}`);
    logToChannel(msg);
    // The 'end' event will fire after a kick and handle reconnection.
  });

  // ── Errors ────────────────────────────────────────────────────────────────
  bot.on('error', (err) => {
    const msg = `❌ Minecraft bot error: ${err.message}`;
    console.error(`[Bot] ${msg}`);
    logToChannel(msg);
    // The 'end' event will fire after an error, triggering reconnect there.
  });

  // ── Disconnected ──────────────────────────────────────────────────────────
  bot.on('end', (reason) => {
    isConnected = false;
    if (whisperTimer) {
      clearInterval(whisperTimer);
      whisperTimer = null;
    }

    const msg = `🔌 Minecraft bot disconnected (${reason || 'unknown reason'}). Reconnecting in 5s…`;
    console.warn(`[Bot] ${msg}`);
    logToChannel(msg);

    if (autoReconnect) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        createBot();
      }, 5000);
    }
  });
}

// ─── Public control functions ─────────────────────────────────────────────────

/**
 * Disconnect the bot and disable auto-reconnect.
 */
function disconnectBot() {
  autoReconnect = false;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (whisperTimer) {
    clearInterval(whisperTimer);
    whisperTimer = null;
  }

  if (bot) {
    try { bot.quit(); } catch (err) { console.warn('[Bot] Error during quit (ignored):', err.message); }
    bot = null;
  }

  isConnected = false;
}

/**
 * Enable auto-reconnect and start a new connection.
 * No-ops if the bot is already connected.
 */
function connectBot() {
  if (isConnected) return;
  autoReconnect = true;
  createBot();
}

/**
 * Return the current mineflayer bot instance (may be null).
 * @returns {import('mineflayer').Bot|null}
 */
function getBot() {
  return bot;
}

module.exports = { createBot, connectBot, disconnectBot, getBot, get isConnected() { return isConnected; }, get autoReconnect() { return autoReconnect; } };
