// src/storage.js
// Handles persistent JSON storage for bot settings (radius + message list).
// All reads/writes go through this module so the rest of the code
// never touches the file directly.

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'settings.json');

// Default settings used when the data file does not exist yet.
const DEFAULTS = {
  radius: 50,
  messages: [],
  server: {
    host: null,
    port: 25565,
  },
  macroDelay: 5,
};

/**
 * Read the settings file.
 * Returns the parsed object, or the defaults if the file is missing / corrupt.
 * @returns {{ radius: number, messages: string[] }}
 */
function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch {
    // File does not exist yet – return defaults.
    return Object.assign({}, DEFAULTS);
  }
}

/**
 * Persist the given settings object to disk.
 * @param {{ radius: number, messages: string[] }} settings
 */
function save(settings) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

// ─── Radius ──────────────────────────────────────────────────────────────────

/**
 * Get the currently saved whisper radius.
 * @returns {number}
 */
function getRadius() {
  return load().radius;
}

/**
 * Persist a new whisper radius.
 * @param {number} radius
 */
function setRadius(radius) {
  const settings = load();
  settings.radius = radius;
  save(settings);
}

// ─── Messages ────────────────────────────────────────────────────────────────

/**
 * Get the full list of whisper messages.
 * @returns {string[]}
 */
function getMessages() {
  return load().messages;
}

/**
 * Add a new message to the pool.
 * Returns false if an identical message already exists.
 * @param {string} text
 * @returns {boolean}
 */
function addMessage(text) {
  const settings = load();
  if (settings.messages.includes(text)) return false;
  settings.messages.push(text);
  save(settings);
  return true;
}

/**
 * Remove a message by its exact text OR by its 1-based index.
 * Returns the removed text on success, or null if not found.
 * @param {string} textOrId
 * @returns {string|null}
 */
function removeMessage(textOrId) {
  const settings = load();
  const byIndex  = parseInt(textOrId, 10);

  let idx = -1;
  if (!Number.isNaN(byIndex) && byIndex >= 1 && byIndex <= settings.messages.length) {
    idx = byIndex - 1; // convert 1-based to 0-based
  } else {
    idx = settings.messages.indexOf(textOrId);
  }

  if (idx === -1) return null;

  const [removed] = settings.messages.splice(idx, 1);
  save(settings);
  return removed;
}

// ─── Server ──────────────────────────────────────────────────────────────────

/**
 * Get the currently saved server settings.
 * @returns {{ host: string|null, port: number }}
 */
function getServer() {
  const settings = load();
  return settings.server || DEFAULTS.server;
}

/**
 * Persist new server connection settings.
 * @param {string} host
 * @param {number} port
 */
function setServer(host, port) {
  const settings = load();
  settings.server = { host, port };
  save(settings);
}

// ─── Macro Delay ─────────────────────────────────────────────────────────────

/**
 * Get the currently saved macro delay (in seconds).
 * @returns {number}
 */
function getMacroDelay() {
  return load().macroDelay ?? DEFAULTS.macroDelay;
}

/**
 * Persist a new macro delay (in seconds).
 * @param {number} seconds
 */
function setMacroDelay(seconds) {
  const settings = load();
  settings.macroDelay = seconds;
  save(settings);
}

module.exports = { getRadius, setRadius, getMessages, addMessage, removeMessage, getServer, setServer, getMacroDelay, setMacroDelay };
