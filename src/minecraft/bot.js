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
const { getRadius, getMessages, getServer } = require('../storage');
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

/** Timer for the "active" random-action loop. */
let activeTimer    = null;

/** Whether active mode is currently enabled. */
let activeMode     = false;

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

// ─── Active behaviour loop ────────────────────────────────────────────────────

/** Milliseconds between each random-action tick while active. */
const ACTIVE_TICK_MS = 3_000; // 3 seconds

/**
 * Perform one random action: jump, walk in a small circle, or swing arm in a
 * random direction.
 */
function activeTick() {
  if (!isConnected || !bot) return;

  const roll = Math.random();

  if (roll < 0.33) {
    // ── Jump ──────────────────────────────────────────────────────────────
    bot.setControlState('jump', true);
    setTimeout(() => {
      if (bot && activeMode && isConnected) bot.setControlState('jump', false);
    }, 500);
  } else if (roll < 0.66) {
    // ── Walk in a small circle ────────────────────────────────────────────
    bot.setControlState('forward', true);
    bot.setControlState('left', true);
    setTimeout(() => {
      if (bot && activeMode && isConnected) {
        bot.setControlState('forward', false);
        bot.setControlState('left', false);
      }
    }, 2000);
  } else {
    // ── Swing arm in a random direction ───────────────────────────────────
    const yaw   = Math.random() * Math.PI * 2 - Math.PI;  // -π to π
    const pitch = Math.random() * Math.PI - Math.PI / 2;  // -π/2 to π/2
    bot.look(yaw, pitch, false);
    bot.swingArm();
  }
}

/**
 * Start the active-behaviour loop (random jumps, circles, arm swings).
 * No-ops if already active.
 */
function startActiveBehavior() {
  if (activeMode) return;
  activeMode = true;
  if (activeTimer) clearInterval(activeTimer);
  activeTick();
  activeTimer = setInterval(activeTick, ACTIVE_TICK_MS);
}

/**
 * Stop the active-behaviour loop.
 */
function stopActiveBehavior() {
  activeMode = false;
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
  // Release any held controls.
  if (bot) {
    bot.setControlState('forward', false);
    bot.setControlState('left', false);
    bot.setControlState('jump', false);
  }
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
  // Remove listeners first so a stale 'end' event from the old bot
  // cannot schedule an unwanted reconnect.
  if (bot) {
    bot.removeAllListeners();
    try { bot.quit(); } catch (_) {}
    bot = null;
  }

  const server = getServer();
  const host = server.host;
  const port = server.port;

  if (!host) {
    const msg = '⚠️ No server configured. Use `/server` to set the IP and port first.';
    console.warn(`[Bot] ${msg}`);
    logToChannel(msg);
    return;
  }

  console.log(`[Bot] Connecting to ${host}:${port} via Microsoft auth…`);

  bot = mineflayer.createBot({
    host,
    port,
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
    const currentServer = getServer();
    logToChannel(`✅ Minecraft bot **${bot.username}** connected to **${currentServer.host}**.`);

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
    stopActiveBehavior();

    const msg = `🔌 Minecraft bot disconnected (${reason || 'unknown reason'}). Reconnecting in 15s…`;
    console.warn(`[Bot] ${msg}`);
    logToChannel(msg);

    if (autoReconnect) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        createBot();
      }, 15000);
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

  stopActiveBehavior();

  if (bot) {
    bot.removeAllListeners();
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

module.exports = { createBot, connectBot, disconnectBot, getBot, startActiveBehavior, stopActiveBehavior, get isConnected() { return isConnected; }, get autoReconnect() { return autoReconnect; }, get isActive() { return activeMode; } };
