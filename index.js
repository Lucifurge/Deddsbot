require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/* =========================
   CRASH PROTECTION
========================= */
process.on("unhandledRejection", err => console.error("Unhandled:", err));
process.on("uncaughtException", err => console.error("Uncaught:", err));

/* =========================
   EXPRESS KEEP-ALIVE
========================= */
const app = express();
app.get("/", (_, res) => res.send("Bot is alive"));
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Express running")
);

/* =========================
   DISCORD CLIENT
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   START TIME
========================= */
const startTime = Date.now();

/* =========================
   STORAGE FILES
========================= */
const verseChannelFile = path.join(__dirname, "dailyChannels.json");
const memeChannelFile = path.join(__dirname, "memeChannels.json");
const customVerseFile = path.join(__dirname, "customVerses.json");

const load = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

let verseChannels = load(verseChannelFile);
let memeChannels = load(memeChannelFile);
let customVerses = load(customVerseFile);

/* =========================
   SAFE MEME API
========================= */
async function safeMeme() {
  try {
    const r = await axios.get("https://meme-api.com/gimme", { timeout: 5000 });
    return r.data;
  } catch {
    return null;
  }
}

/* =========================
   SLASH COMMANDS
========================= */
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check bot status"),
  new SlashCommandBuilder().setName("uptime").setDescription("Bot uptime"),
  new SlashCommandBuilder().setName("help").setDescription("Show commands"),

  new SlashCommandBuilder()
    .setName("setdailychannel")
    .setDescription("Set daily verse channel")
    .addChannelOption(o =>
      o.setName("channel").setDescription("Channel").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setdailyverse")
    .setDescription("Set the verse that will post daily")
    .addStringOption(o =>
      o.setName("reference").setDescription("Verse reference").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("text").setDescription("Verse text").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setmemeschannel")
    .setDescription("Set meme channel")
    .addChannelOption(o =>
      o.setName("channel").setDescription("Channel").setRequired(true)
    ),

  new SlashCommandBuilder().setName("meme").setDescription("Get a meme"),
].map(c => c.toJSON());

/* =========================
   REGISTER COMMANDS
========================= */
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Commands registered");
})();

/* =========================
   COMMAND HANDLER
========================= */
client.on("interactionCreate", async i => {
  if (!i.isCommand()) return;

  try {
    switch (i.commandName) {

      case "ping":
        return i.reply("🟢 Bot Online");

      case "uptime":
        return i.reply(`⏱ Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);

      case "help":
        return i.reply(
          "**📜 Commands**\n" +
          "/ping\n/uptime\n/meme\n" +
          "/setdailyverse\n/setdailychannel\n/setmemeschannel"
        );

      case "setdailyverse":
        customVerses[i.guildId] = {
          reference: i.options.getString("reference"),
          text: i.options.getString("text")
        };
        save(customVerseFile, customVerses);
        return i.reply("📖 Daily verse saved");

      case "setdailychannel": {
        const channel = i.options.getChannel("channel");
        verseChannels[i.guildId] = channel.id;
        save(verseChannelFile, verseChannels);

        const verse = customVerses[i.guildId];
        if (verse) {
          await channel.send(`📖 **${verse.reference}**\n${verse.text}`);
        }

        return i.reply("✅ Daily verse channel set and verse sent!");
      }

      case "setmemeschannel":
        memeChannels[i.guildId] = i.options.getChannel("channel").id;
        save(memeChannelFile, memeChannels);
        return i.reply("✅ Meme channel set");

      case "meme": {
        const m = await safeMeme();
        return i.reply(m ? { files: [m.url] } : "No meme available");
      }
    }
  } catch (e) {
    console.error(e);
    if (!i.replied) i.reply("⚠️ Error handled safely");
  }
});

/* =========================
   BACKGROUND JOBS
========================= */
function startJobs() {

  // DAILY VERSE (24 HOURS)
  setInterval(async () => {
    for (const g in verseChannels) {
      try {
        const channel = await client.channels.fetch(verseChannels[g]);
        const verse = customVerses[g];
        if (!channel || !verse) continue;

        channel.send(`📖 **${verse.reference}**\n${verse.text}`);
      } catch (e) {
        console.error("Verse job error:", e);
      }
    }
  }, 24 * 60 * 60 * 1000);

  // MEMES EVERY 1 HOUR
  setInterval(async () => {
    for (const g in memeChannels) {
      try {
        const channel = await client.channels.fetch(memeChannels[g]);
        const meme = await safeMeme();
        if (channel && meme) {
          channel.send({ content: "😂 **Hourly Meme**", files: [meme.url] });
        }
      } catch (e) {
        console.error("Meme job error:", e);
      }
    }
  }, 60 * 60 * 1000);
}

/* =========================
   READY
========================= */
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startJobs();
});

/* =========================
   LOGIN
========================= */
client.login(process.env.TOKEN);
