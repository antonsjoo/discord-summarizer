import { config } from 'dotenv';
import { Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import OpenAI from 'openai';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});




client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || message.content !== '!tldr') return;
    if (!message.channel.isTextBased()) return;

    const channel = message.channel as TextChannel;

    try {
        const messages = await channel.messages.fetch({ limit: 100 });

        const now = Date.now();
        const recentMessages = messages
            .filter(msg => now - msg.createdTimestamp < 24 * 60 * 60 * 1000)
            .reverse()
            .map(msg => `${msg.author.displayName}: ${msg.content}`)
            .filter(line => line.trim().length > 0);

        if (recentMessages.length === 0) {
            await message.reply('No messages from the past 24 hours to summarize.');
            return;
        }

        const prompt = `
Du är en Discord-bot med glimten i ögat. Sammanfatta följande chatt från de senaste 24 timmarna — på svenska, med samma ton, jargong och ordförråd som deltagarna.

Var rolig, kvick och direkt, men utan att hitta på saker. Få det att låta som om en av deltagarna själv återberättar det.

Chatten:
${recentMessages.join('\n')}
`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
        });

        const summary = response.choices[0].message?.content ?? 'No summary generated.';

        console.log(response.choices[0].message?.content ?? 'No summary generated.');

        await message.reply(summary);

    } catch (error) {
        console.error('Error fetching or summarizing messages:', error);
        await message.reply('Failed to summarize messages.');
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
});

client.login(process.env.DISCORD_TOKEN);