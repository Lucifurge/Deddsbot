require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/* =========================
   EXPRESS KEEP ALIVE
========================= */
const app = express();
app.get("/", (_, res) => res.send("Bot alive"));
app.listen(process.env.PORT || 3000, () => console.log("✅ Express running"));

/* =========================
   DISCORD CLIENT
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   FILE STORAGE
========================= */
const verseFile = path.join(__dirname, "dailyVerse.json");
const channelFile = path.join(__dirname, "verseChannels.json");

const load = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

let dailyVerses = load(verseFile);
let verseChannels = load(channelFile);

/* =========================
   BIBLE API FETCH
========================= */
async function getVerse(verseName) {
  try {
    const r = await axios.get(`https://bible-api.com/${encodeURIComponent(verseName)}`);
    return `📖 **${r.data.reference}**\n${r.data.text.trim()}`;
  } catch {
    return null;
  }
}

/* =========================
   SLASH COMMANDS
========================= */
const commands = [
  new SlashCommandBuilder()
    .setName("addverse")
    .setDescription("Add a Bible verse (type only verse name)")
    .addStringOption(o =>
      o.setName("verse")
       .setDescription("Example: John 3:16")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setdailyverse")
    .setDescription("Set the channel for the daily Bible verse")
    .addChannelOption(o =>
      o.setName("channel")
       .setDescription("Channel for daily verse")
       .setRequired(true)
    )
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

  if (i.commandName === "addverse") {
    const verse = i.options.getString("verse");
    const fetched = await getVerse(verse);

    if (!fetched) {
      return i.reply("❌ Verse not found. Please check the verse name.");
    }

    dailyVerses[i.guildId] = verse;
    save(verseFile, dailyVerses);

    return i.reply(`✅ Daily verse set to **${verse}**`);
  }

  if (i.commandName === "setdailyverse") {
    const channel = i.options.getChannel("channel");
    const verseName = dailyVerses[i.guildId];

    if (!verseName) {
      return i.reply("⚠️ Please add a verse first using /addverse");
    }

    verseChannels[i.guildId] = channel.id;
    save(channelFile, verseChannels);

    const verseText = await getVerse(verseName);
    if (verseText) await channel.send(verseText);

    return i.reply("✅ Daily verse channel set and verse posted!");
  }
});

/* =========================
   DAILY AUTO POST (24H)
========================= */
setInterval(async () => {
  for (const guildId in verseChannels) {
    try {
      const channel = await client.channels.fetch(verseChannels[guildId]);
      const verseName = dailyVerses[guildId];
      if (!channel || !verseName) continue;

      const verseText = await getVerse(verseName);
      if (verseText) channel.send(verseText);
    } catch (e) {
      console.error("Daily verse error:", e);
    }
  }
}, 24 * 60 * 60 * 1000);

/* =========================
   READY
========================= */
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =========================
   LOGIN
========================= */
client.login(process.env.TOKEN);
