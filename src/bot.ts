import { config } from 'dotenv';
import { Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import OpenAI from 'openai';

config();

const MODEL = 'o4-mini'; // Default model, can be changed per command
const VERSION = '1.1.0'; // Bot version

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
    if (message.author.bot || !message.channel.isTextBased()) return;

    const content = message.content.trim();
    const channel = message.channel as TextChannel;

    const [command, ...args] = content.split(' ');
    const restOfMessage = args.join(' ');

    switch (command) {
        case '!tldr':
            try {
                const messages = await channel.messages.fetch({ limit: 50 });
                const now = Date.now();
                const recentMessages = messages
                    .filter(msg => now - msg.createdTimestamp < 24 * 60 * 60 * 1000)
                    .reverse()
                    .map(msg => `${msg.author.displayName}: ${msg.content}`)
                    .filter(line => line.trim().length > 0)
                    .slice(-25);

                if (recentMessages.length === 0) {
                    await message.reply('No messages from the past 24 hours to summarize.');
                    return;
                }

                const prompt = `
Du är en Discord-bot med skön ortenjargong — en riktig bror från förorten. Du snackar som en av grabbarna: svär mycket, har noll filter, men är ändå skön, kvick och har glimten i ögat. 

Din uppgift är att sammanfatta vad som hänt i chatten de senaste 24 timmarna — som om du berättade det för en polare som precis joinat och ba "ey vad fan har jag missat?". Gör det på svenska, med samma stil, slang och attityd som deltagarna. Det ska kännas 100% som att det är en av dom som återberättar det.

Viktigt:
- Hitta INTE på skit — du återberättar bara det som faktiskt skrivits.
- Ignorera helt dina egna meddelanden — du snackar inte om dig själv, fattar du?
- Svär gärna och mycket
- Håll det tajt, roligt och med lite disrespect om nån förtjänade det. Som det snackas i chatten, så snackar du. Punkt.

Chatten:
${recentMessages.join('\n')}
`;
                const response = await openai.chat.completions.create({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    max_completion_tokens: 800
                });

                const summary = response.choices[0].message?.content ?? 'No summary generated.';
                await message.reply(summary);
            } catch (error) {
                console.error('Error summarizing messages:', error);
                await message.reply('Failed to summarize messages.');
            }
            break;

        case '!factcheck':
            if (!restOfMessage) {
                await message.reply('Vad vill du att jag ska faktagranska?');
                return;
            }

            try {
                const prompt = `
Du är en korrekt, opartisk faktagranskande assistent. Utvärdera följande påstående och avgör om det är sant, falskt eller vilseledande. Motivera svaret kort men tydligt på svenska.
Påstående:
"${restOfMessage}"
`;

                const response = await openai.chat.completions.create({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 300
                });

                const factCheck = response.choices[0].message?.content ?? 'Inget svar genererat.';
                await message.reply(factCheck);
            } catch (error) {
                console.error('Error factchecking:', error);
                await message.reply('Kunde inte faktagranska just nu.');
            }
            break;


        case '!ask':
            if (!restOfMessage) {
                await message.reply('Vad vill du att jag ska svara på?');
                return;
            }

            try {
                const prompt = `
Du är en bror från orten med svar på allt. Du är smart som fan, men snackar inte som nån jävla professor — du förklarar saker som en grabb som vet vad han snackar om. Rakt, enkelt, fett och på svenska.

Nån ställer en fråga, och du ger ett svar som är både hjälpsamt och med rätt jargong. Du får svära, du får va dryg om frågan är dum, men du ska alltid ge ett vettigt svar. Inget bullshit, inget tillgjort, bara ärlig kunskap med stil.

Fråga:
"${restOfMessage}"
`;

                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 300
                });

                const answer = response.choices[0].message?.content ?? 'Inget svar genererat.';
                await message.reply(answer);
            } catch (error) {
                console.error('Error answering question:', error);
                await message.reply('Kunde inte svara på frågan just nu.');
            }
            break;
        case '!help':
            const helpMessage = `
**Tillgängliga kommandon:**
- **!tldr**: Sammanfatta de senaste 24 timmarna av ch
atten.
- **!factcheck <påstående>**: Faktagranska ett påstående.
- **!ask <fråga>**: Ställ en fråga och få ett svar
- **!ping**: Kolla botens respons.
- **!version**: Visa botens version.
- **!help**: Visa denna hjälptext.
Använd kommandona direkt i kanalen där du vill ha svar.
`;
            await message.reply(helpMessage);
            break;
        case '!ping':
            await message.reply('Pong! 🏓')
            break
        case '!version':
            await message.reply(`Bot version: ${VERSION}`);
            break
        case '!stats':
            const statsMessage = `
                    **Bot Stats:**
                    - **Användare:** ${client.users.cache.size}
                    - **Servrar:** ${client.guilds.cache.size}
                    - **Kanaler:** ${client.channels.cache.size}
                    - **Uptime:** ${Math.floor(client.uptime! / 1000)} sek
                    - **Ping:** ${client.ws.ping} ms
                    
                    `
            await message.reply(statsMessage)
            break
        case '!invite':
            const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`
            await message.reply(`Bjud in mig till din server: ${inviteLink}`)
            break
        case '!source':
            await message.reply('Källkoden finns på GitHub: https://github.com/your-repo')
            break
        case '!about':
            const aboutMessage = `
**Om denna bot:**
En enkel Discord-bot som sammanfattar chattar, faktagranskar påståenden
och svarar på frågor med hjälp av OpenAI:s GPT-4o-mini-modell. Den är designad för att vara rolig, kvick och direkt, och använder samma ton och jargong som deltagarna.
Skapad för att göra Discord-chattar mer informativa och underhållande.
Använd kommandona direkt i kanalen där du vill ha svar.
`;
            await message.reply(aboutMessage);
            break;

        default:
            break;
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);


});

client.login(process.env.DISCORD_TOKEN);