import { Client, Emoji, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } from 'discord.js';

// Args
if (process.argv.length < 3) {
    console.log('Usage: npx node-ts index.ts <discord bot api token>');
    process.exit(1);
}

const discordBotApiToken = process.argv[2];

// Instantiate Discord client ('MESSAGE', 'CHANNEL', 'REACTION' partials needed for global reaction listening).
const client  = new Client({
	intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
    ],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Splits text into an array of as long as possible chunks, but not longer than maxChunkLength
// preferrably separating it with preferredSeparator.
function chunkMessage(text: string, preferredSeparator: string) {
    const MAX_MESSAGE_LENGTH = 1900;
    const re = new RegExp(`((.|\n){1,${MAX_MESSAGE_LENGTH}}(${preferredSeparator}|$))`, 'g');
    const textChunks = text.match(re);
    return textChunks ? textChunks : [''];
}

function stringDistance(a: string, b: string) {
    a = a.toLowerCase();
    b = b.toLowerCase();

    const M: number[][] = new Array(a.length + 1).fill(0).map(() => new Array(b.length + 1).fill(-1));
    const MIsInsert: boolean[][] = new Array(a.length + 1).fill(0).map(() => new Array(b.length + 1).fill(false));

    function f(i: number, j: number) {
        if (M[i][j] !== -1) return M[i][j];

        const ret = (() => {
            if (j == b.length) return 0.01 * (a.length - i);
            if (i == a.length) return 1 * (b.length - j);

            const matchCost = a[i] == b[j] ? f(i + 1, j + 1) : Infinity;
            const replaceCost = f(i + 1, j + 1) + 1;
            const deleteCost = f(i, j + 1) + 1;
            const insertCost = f(i + 1, j) + (MIsInsert[i + 1][j] ? 0 : 1);

            const min = Math.min(matchCost, replaceCost, deleteCost, insertCost);

            if (min == insertCost) MIsInsert[i][j] = true;

            return min;
        })();

        M[i][j] = ret;
        return ret;
    }

    return f(0, 0);
}

function getAllAvailableEmojis() {
    const emojis: Emoji[] = [];

    for (const guild of client.guilds.cache.values()) {
        emojis.push(...guild.emojis.cache.filter(it => it.available && !it.managed).map(it => it));
    }

    return emojis;
}

client.on('interactionCreate', async interaction => {

    if (interaction.isAutocomplete() && interaction.commandName === 'react') {
        const input = interaction.options.getString('emoji_name') ?? '';

        const allEmojiNames = getAllAvailableEmojis().filter(it => it.name).map(it => it.name!);

        const filtered = allEmojiNames.filter(it => stringDistance(it, input) < input.length * 2/3);

        const sorted = filtered.sort((a, b) => stringDistance(a, input) - stringDistance(b, input));

        const choices = sorted.map(it => ({name: it, value: it})).slice(0, 3);
        await interaction.respond(choices);
    }

    if (!interaction.isCommand()) return;


    // React command.
    if (interaction.commandName === 'react') {
        //@ts-ignore
        const emojiName = interaction.options.getString('emoji_name');

        // Find the emoji by its name across all the bot's guilds.
        let emoji: Emoji | undefined;
        for (const guild of interaction.client.guilds.cache.values()) {
            const foundEmoji = guild.emojis.cache.find(e => e.name?.toLowerCase() === emojiName.toLowerCase());
            if (foundEmoji) {
                emoji = foundEmoji;
                break;
            }
        }

        if (!emoji) {
            await interaction.reply({ content: `Couldn't find the specified emoji in any of the servers I'm in.`, ephemeral: true });
            return;
        }


        try {
            let targetMessage;
            //@ts-ignore
            const messageLink = interaction.options.getString('target_message_link');

            if (messageLink) {
                const linkRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
                const match = messageLink.match(linkRegex);
                if (match) {
                    const [, , channelId, messageId] = match;
                    if (channelId === interaction.channelId) {
                        targetMessage = await interaction.channel!.messages.fetch(messageId);
                    }
                }
            } else {
                const messages = await interaction.channel!.messages.fetch({ limit: 1 });
                targetMessage = messages.first();
            }

            if (!targetMessage) {
                await interaction.reply({ content: `No target message found to react to.`, ephemeral: true });
                return;
            }

            await targetMessage.react(emoji.toString());
            const messageLink2 = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${targetMessage.id}`;
            const replyContent = `Reacted to ${messageLink2} with ${emoji.toString()}!`;

            await interaction.reply({ content: replyContent, ephemeral: true });
        } catch (e) {
            console.log(e);
            await interaction.reply({ content: `Couldn't react to the message!`, ephemeral: true });
            return;
        }
    }

    // List emojis command.
    if (interaction.commandName === 'listemojis') {
        const allEmojiNames: string[] = [];

        for (const guild of interaction.client.guilds.cache.values()) {
            allEmojiNames.push(...guild.emojis.cache.filter(it => it.available && !it.managed).map(it => it.toString()));
        }

        const allEmojiNamesString = getAllAvailableEmojis().join(' ');

        await interaction.reply({
            content: `Here's a list of all the emojis I can use:`,
            ephemeral: true
        });

        for (const it of chunkMessage(allEmojiNamesString, ' ')) {
            await interaction.followUp({ content: it, ephemeral: true });
        }

        return;
    }
});

client.once('ready', async () => {
    console.log('Bot is online!');

    const commands = [
        new SlashCommandBuilder()
            .setName('react')
            .setDescription('React to the previous message with a specified emoji.')
            .addStringOption(option => 
                option.setName('emoji_name')
                .setDescription('Name of the emoji to use forp the reaction.')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => 
                option.setName('target_message_link')
                .setDescription('Link to the target message you want to react to.')
            ),

        new SlashCommandBuilder()
            .setName('listemojis')
            .setDescription('List all available emojis that the bot can use.'),
    ];

    const rest = new REST({ version: '10' }).setToken(discordBotApiToken);

    for (const guild of client.guilds.cache.values()) {
        try {
            console.log(`Registering command for guild: ${guild.name} (${guild.id})`);

            await rest.put(
                Routes.applicationGuildCommands(client.user!.id, guild.id),
                { body: commands },
            );

            console.log(`Successfully registered command for guild: ${guild.name} (${guild.id})`);
        } catch (error) {
            console.error(`Failed to register command for guild: ${guild.name} (${guild.id})`, error);
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.id != client.user?.id) {
        reaction.users.remove(client.user!.id);
    }
});

client.login(discordBotApiToken);

console.log('Started!');
