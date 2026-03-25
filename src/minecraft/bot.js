// src/minecraft/bot.js
// Manages the mineflayer Minecraft bot:
//   – connects to DonutSMP
//   – automatically whispers random nearby players
//   – respects the configurable radius
//   – has anti-spam protections (delay between whispers, cooldown per player)
//   – handles disconnects with automatic reconnection

'use strict';

const mineflayer     = require('mineflayer');
const config         = require('../config');
const { getRadius, getMessages } = require('../storage');
const { logToChannel }           = require('../discord/client');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Milliseconds between each whisper attempt. */
const WHISPER_INTERVAL_MS = 15_000; // 15 seconds

/** How long (ms) before the same player can be whispered again. */
const PER_PLAYER_COOLDOWN_MS = 60_000; // 1 minute

/** Milliseconds before attempting a reconnect after a disconnect. */
const RECONNECT_DELAY_MS = 10_000; // 10 seconds

// ─── State ────────────────────────────────────────────────────────────────────

let bot            = null;
let whisperTimer   = null;
let isConnected    = false;

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
  bot.chat(`/w ${target.username} ${message}`);
  lastWhispered.set(target.username, now);

  const log = `💬 Whispered **${target.username}**: "${message}"`;
  console.log(`[Bot] ${log}`);
  logToChannel(log);
}

// ─── Bot creation ─────────────────────────────────────────────────────────────

/**
 * Create and wire up a new mineflayer bot instance.
 * Call this once at startup; it will reconnect automatically on disconnect.
 */
function createBot() {
  console.log(`[Bot] Connecting to ${config.minecraft.host}:${config.minecraft.port} as ${config.minecraft.username}…`);

  const botOptions = {
    host:    config.minecraft.host,
    port:    config.minecraft.port,
    username: config.minecraft.username,
    auth:    config.minecraft.password ? 'microsoft' : 'offline',
  };

  if (config.minecraft.password) {
    botOptions.password = config.minecraft.password;
  }

  bot = mineflayer.createBot(botOptions);

  // ── Connected ──────────────────────────────────────────────────────────────
  bot.once('spawn', () => {
    isConnected = true;
    console.log('[Bot] Connected to the server.');
    logToChannel(`✅ Minecraft bot **${config.minecraft.username}** connected to **${config.minecraft.host}**.`);

    // Start the whisper loop.
    if (whisperTimer) clearInterval(whisperTimer);
    whisperTimer = setInterval(whisperTick, WHISPER_INTERVAL_MS);
  });

  // ── Chat messages (for debugging) ─────────────────────────────────────────
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    // Only log whisper-related chat to avoid noise.
    if (text.toLowerCase().includes('whisper') || text.includes('/w ')) {
      console.log(`[Bot] Chat: ${text}`);
    }
  });

  // ── Kicked ────────────────────────────────────────────────────────────────
  bot.on('kicked', (reason) => {
    isConnected = false;
    const msg = `⚠️ Minecraft bot was kicked: ${reason}`;
    console.warn(`[Bot] ${msg}`);
    logToChannel(msg);
    scheduleReconnect();
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
    const msg = `🔌 Minecraft bot disconnected (${reason || 'unknown reason'}). Reconnecting in ${RECONNECT_DELAY_MS / 1000}s…`;
    console.warn(`[Bot] ${msg}`);
    logToChannel(msg);
    scheduleReconnect();
  });
}

/**
 * Schedule a reconnect attempt after RECONNECT_DELAY_MS.
 * Guards against duplicate timers by using a one-shot timeout.
 */
let reconnectTimeout = null;
function scheduleReconnect() {
  if (reconnectTimeout) return; // already scheduled
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, RECONNECT_DELAY_MS);
}

module.exports = { createBot };
