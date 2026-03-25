# DonutSMP Whisper Bot

A Node.js bot that connects to **DonutSMP** Minecraft server and automatically whispers random nearby players. Messages and radius are managed via **Discord slash commands**.

---

## Features

- 🎮 **Minecraft bot** using `mineflayer` – connects to DonutSMP and whispers nearby players
- 💬 **Configurable whisper radius** – set via `/radius set <number>` in Discord
- 📋 **Managed message pool** – add/remove/list whisper messages via Discord
- ⏱️ **Anti-spam protection** – per-player cooldown + global whisper interval
- 🔄 **Auto-reconnect** – bot reconnects automatically if disconnected
- 📢 **Discord logging** – all bot events are logged to a configurable Discord channel
- ⏳ **Command cooldown** – 3-second per-user cooldown on all Discord commands
- 💾 **Persistent storage** – radius and messages survive restarts (JSON file)

---

## Project Structure

```
Message-bot/
├── src/
│   ├── commands/
│   │   ├── radius.js        # /radius set command
│   │   └── message.js       # /message add|remove|list commands
│   ├── discord/
│   │   └── client.js        # Discord client + cooldown + channel logger
│   ├── minecraft/
│   │   └── bot.js           # mineflayer bot + whisper loop
│   ├── config.js            # Environment variable loading
│   └── storage.js           # Persistent JSON storage
├── data/
│   └── settings.json        # Auto-generated – stores radius & messages
├── index.js                 # Main entry point
├── register-commands.js     # Run once to deploy slash commands
├── package.json
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or later
- A **Discord application** with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A **Minecraft account** accepted on DonutSMP

---

## Setup

### 1. Clone / download the repo

```bash
git clone https://github.com/ghandourak11-design/Message-bot.git
cd Message-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Discord
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_client_id
CHAT_CHANNEL_ID=the_channel_id_for_bot_logs

# Your Discord server (guild) ID for instant command registration
# Right-click your server name in Discord (Developer Mode) → Copy Server ID
# If omitted, commands register globally (takes up to 1 hour to appear)
DISCORD_GUILD_ID=your_discord_guild_id_here

# Minecraft
MINECRAFT_HOST=mc.donutsmp.net
MINECRAFT_PORT=25565
```

> **How to get IDs:** Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode), then right-click any channel or server to copy its ID.

> **Microsoft authentication:** No Minecraft username or password is needed. When the bot first starts it will post a 🔐 **Microsoft Auth Required** embed to your `CHAT_CHANNEL_ID` channel containing a short code and a link (`https://www.microsoft.com/link`). Open that link, enter the code, and sign in with your Microsoft/Minecraft account. The bot will connect automatically once you complete the flow.

### 4. Register slash commands

Run this **once** to register the `/radius` and `/message` commands with Discord:

```bash
npm run register
```

- If `DISCORD_GUILD_ID` is set in `.env`, commands register instantly to that guild (great for testing).
- Without it, commands register globally and may take up to **1 hour** to appear.

### 5. Start the bot

```bash
npm start
```

The bot will:
1. Log in to Discord
2. Post a 🔐 **Microsoft Auth Required** embed in your `CHAT_CHANNEL_ID` channel with a device code
3. After you authenticate via the link in the embed, connect to the Minecraft server
4. Start whispering nearby players every 15 seconds

---

## Discord Slash Commands

| Command | Description |
|---|---|
| `/radius set <number>` | Set the whisper detection radius (1–512 blocks) |
| `/message add <text>` | Add a new message to the whisper pool |
| `/message remove <text or id>` | Remove a message by its text or list number |
| `/message list` | Show all current whisper messages |

All commands have a **3-second per-user cooldown**.

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Discord bot token |
| `DISCORD_CLIENT_ID` | ✅ | Discord application/client ID |
| `CHAT_CHANNEL_ID` | ✅ | Channel ID for bot logs and auth codes |
| `MINECRAFT_HOST` | ✅ | Minecraft server host |
| `MINECRAFT_PORT` | ❌ | Server port (default: `25565`) |
| `DISCORD_GUILD_ID` | ❌ | Guild ID for instant command registration |

---

## Storage

Settings are saved to `data/settings.json` automatically. Example:

```json
{
  "radius": 50,
  "messages": [
    "Hey! Want to team up?",
    "Nice to meet you on DonutSMP!"
  ]
}
```

This file is created automatically on first run and survives restarts.

---

## Behaviour Notes

- The bot whispers **one random eligible player** every **15 seconds**
- A player won't be whispered again for **60 seconds** after receiving a message
- The bot skips its tick if there are no messages in the pool or no eligible players nearby
- If the bot disconnects, it will attempt to reconnect after **10 seconds**

---

## License

ISC