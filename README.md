# Discord React Bot

A Discord bot for reacting to messages with custom server emojis via slash commands.

## Features

- React to any message with a custom emoji using the `/react` slash command
- Fuzzy emoji name autocomplete
- List all available custom emojis with `/listemojis`

## Requirements

- Node.js v19.6.0+ (recommend installing via [fnm](https://github.com/Schniz/fnm))

## Installation

**1. Install fnm and Node.js**
```bash
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 20
fnm use 20
```

**2. Clone and install dependencies**
```bash
git clone https://github.com/zupanibla/discord-react-bot
cd discord-react-bot
npm install
```

**3. Run**
```bash
node node_modules/.bin/tsx index.ts <bot token>
```

- `bot token` — your Discord bot token from the [Developer Portal](https://discord.com/developers/applications)

## Commands

| Command | Description |
|---|---|
| `/react <emoji_name>` | React to the previous message with a custom emoji. Supports fuzzy autocomplete. |
| `/react <emoji_name> <target_message_link>` | React to a specific message by its Discord link. |
| `/listemojis` | List all custom emojis available to the bot across all servers. |
