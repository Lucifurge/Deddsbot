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
app.listen(process.env.PORT || 3000);

/* =========================
   DISCORD CLIENT
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/* =========================
   START TIME (UPTIME)
========================= */
const startTime = Date.now();

/* =========================
   STORAGE FILES
========================= */
const verseFile = path.join(__dirname, "dailyChannels.json");
const memeFile = path.join(__dirname, "memeChannels.json");

const load = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

let verseChannels = load(verseFile);
let memeChannels = load(memeFile);

/* =========================
   SAFE API HELPERS
========================= */
async function safeVerse() {
  try {
    const r = await axios.get("https://bible-api.com/?random=verse", { timeout: 4000 });
    return r.data;
  } catch {
    return null;
  }
}

async function safeMeme() {
  try {
    const r = await axios.get("https://meme-api.com/gimme", { timeout: 4000 });
    return r.data;
  } catch {
    return null;
  }
}

/* =========================
   SLASH COMMANDS
========================= */
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Bot status"),
  new SlashCommandBuilder().setName("help").setDescription("Show all commands"),
  new SlashCommandBuilder().setName("uptime").setDescription("Bot uptime"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Server info"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("User info")
    .addUserOption(o => o.setName("user").setDescription("Select user")),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("User avatar")
    .addUserOption(o => o.setName("user").setDescription("Select user")),

  new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
  new SlashCommandBuilder().setName("roll").setDescription("Roll a dice"),
  new SlashCommandBuilder().setName("meme").setDescription("Send a meme"),
  new SlashCommandBuilder().setName("verse").setDescription("Bible verse"),

  new SlashCommandBuilder()
    .setName("setdailychannel")
    .setDescription("Set daily verse channel")
    .addChannelOption(o => o.setName("channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("setmemeschannel")
    .setDescription("Set auto meme channel")
    .addChannelOption(o => o.setName("channel").setRequired(true))
].map(c => c.toJSON());

/* =========================
   REGISTER COMMANDS
========================= */
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Commands registered");
  } catch (e) {
    console.error("Command register error:", e);
  }
})();

/* =========================
   COMMAND HANDLER
========================= */
client.on("interactionCreate", async i => {
  if (!i.isCommand()) return;

  try {
    if (i.commandName === "ping")
      return i.reply("🟢 Bot Online");

    if (i.commandName === "help")
      return i.reply(
        "**📜 Commands**\n" +
        "/ping\n/help\n/uptime\n/serverinfo\n/userinfo\n/avatar\n" +
        "/verse\n/meme\n/coinflip\n/roll\n" +
        "/setdailychannel\n/setmemeschannel"
      );

    if (i.commandName === "uptime") {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      return i.reply(`⏱ Uptime: ${seconds}s`);
    }

    if (i.commandName === "serverinfo")
      return i.reply(`🏠 ${i.guild.name}\n👥 Members: ${i.guild.memberCount}`);

    if (i.commandName === "userinfo") {
      const user = i.options.getUser("user") || i.user;
      return i.reply(`👤 ${user.tag}\n🆔 ${user.id}`);
    }

    if (i.commandName === "avatar") {
      const user = i.options.getUser("user") || i.user;
      return i.reply(user.displayAvatarURL({ size: 512 }));
    }

    if (i.commandName === "coinflip")
      return i.reply(Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails");

    if (i.commandName === "roll")
      return i.reply(`🎲 Rolled: ${Math.floor(Math.random() * 6) + 1}`);

    if (i.commandName === "meme") {
      const m = await safeMeme();
      return i.reply(m ? { content: m.title, files: [m.url] } : "No meme available");
    }

    if (i.commandName === "verse") {
      const v = await safeVerse();
      return i.reply(v ? `📖 **${v.reference}**\n${v.text}` : "Verse unavailable");
    }

    if (i.commandName === "setdailychannel") {
      verseChannels[i.guildId] = i.options.getChannel("channel").id;
      save(verseFile, verseChannels);
      return i.reply("✅ Daily verse channel set");
    }

    if (i.commandName === "setmemeschannel") {
      memeChannels[i.guildId] = i.options.getChannel("channel").id;
      save(memeFile, memeChannels);
      return i.reply("✅ Meme channel set");
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
  setInterval(async () => {
    for (const g in verseChannels) {
      try {
        const c = await client.channels.fetch(verseChannels[g]);
        const v = await safeVerse();
        if (c && v) c.send(`📖 **${v.reference}**\n${v.text}`);
      } catch {}
    }
  }, 60 * 60 * 1000); // hourly

  setInterval(async () => {
    for (const g in memeChannels) {
      try {
        const c = await client.channels.fetch(memeChannels[g]);
        const m = await safeMeme();
        if (c && m) c.send({ content: m.title, files: [m.url] });
      } catch {}
    }
  }, 10 * 60 * 1000); // every 10 min
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
