"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const discord_js_1 = require("discord.js");
const openai_1 = __importDefault(require("openai"));
(0, dotenv_1.config)();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ]
});
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content !== '!tldr')
        return;
    if (!message.channel.isTextBased())
        return;
    const channel = message.channel;
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
    }
    catch (error) {
        console.error('Error fetching or summarizing messages:', error);
        await message.reply('Failed to summarize messages.');
    }
});
client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
});
client.login(process.env.DISCORD_TOKEN);
