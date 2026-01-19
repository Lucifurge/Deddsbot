require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/* =========================
   SAFETY
========================= */
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* =========================
   EXPRESS & FRONTEND
========================= */
const app = express();
app.use(express.json());
app.use(express.static("public")); // Serve static files (CSS/JS/images)

// Serve HTML homepage
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: Bot status
app.get("/api/status", (_, res) => {
  res.json({
    name: "FEBIASBOTS",
    online: client.isReady(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    servers: client.guilds?.cache.size || 0
  });
});

// API: Commands list
app.get("/api/commands", (_, res) => {
  res.json([
    { name: "/ping", desc: "Check bot status" },
    { name: "/uptime", desc: "Bot uptime" },
    { name: "/help", desc: "Show commands" },
    { name: "/setdailyverse", desc: "Set daily Bible verse channel" },
    { name: "/addverse", desc: "Post a specific Bible verse" },
    { name: "/setmemeschannel", desc: "Set meme channel" },
    { name: "/meme", desc: "Get a meme" }
  ]);
});

app.listen(process.env.PORT || 3000, () => console.log("🌐 Web server running"));

/* =========================
   DISCORD CLIENT
========================= */
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const startTime = Date.now();

/* =========================
   STORAGE
========================= */
const verseChannelFile = path.join(__dirname, "dailyVerseChannels.json");
const memeChannelFile = path.join(__dirname, "memeChannels.json");

const load = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

let verseChannels = load(verseChannelFile);
let memeChannels = load(memeChannelFile);

/* =========================
   APIs
========================= */
async function randomVerse() {
  try {
    const r = await axios.get("https://bible-api.com/?random=verse");
    return `📖 **${r.data.reference}**\n${r.data.text.trim()}`;
  } catch {
    return null;
  }
}

async function fetchVerse(ref) {
  try {
    const r = await axios.get(`https://bible-api.com/${encodeURIComponent(ref)}`);
    return `📖 **${r.data.reference}**\n${r.data.text.trim()}`;
  } catch {
    return null;
  }
}

async function safeMeme() {
  try {
    const r = await axios.get("https://meme-api.com/gimme");
    return r.data;
  } catch {
    return null;
  }
}

/* =========================
   COMMANDS
========================= */
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check bot status"),
  new SlashCommandBuilder().setName("uptime").setDescription("Bot uptime"),
  new SlashCommandBuilder().setName("help").setDescription("Show commands"),
  new SlashCommandBuilder()
    .setName("setdailyverse")
    .setDescription("Set channel for random daily Bible verse")
    .addChannelOption(o => o.setName("channel").setDescription("Daily verse channel").setRequired(true)),
  new SlashCommandBuilder()
    .setName("addverse")
    .setDescription("Post a specific Bible verse")
    .addStringOption(o => o.setName("verse").setDescription("Example: John 3:16").setRequired(true)),
  new SlashCommandBuilder()
    .setName("setmemeschannel")
    .setDescription("Set meme channel")
    .addChannelOption(o => o.setName("channel").setDescription("Meme channel").setRequired(true)),
  new SlashCommandBuilder().setName("meme").setDescription("Get a meme")
].map(c => c.toJSON());

/* =========================
   REGISTER COMMANDS
========================= */
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log("✅ Commands registered");
})();

/* =========================
   HANDLER
========================= */
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  try {
    switch (interaction.commandName) {
      case "ping":
        return interaction.reply("🟢 Bot Online");

      case "uptime":
        return interaction.reply(`⏱ Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);

      case "help":
        return interaction.reply(
          "**📜 Commands**\n" +
          "/ping\n/uptime\n/meme\n" +
          "/setdailyverse\n/addverse\n/setmemeschannel"
        );

      case "setdailyverse": {
        const channel = interaction.options.getChannel("channel");
        verseChannels[interaction.guildId] = channel.id;
        save(verseChannelFile, verseChannels);

        const verse = await randomVerse();
        if (verse) await channel.send(verse);

        return interaction.reply("✅ Daily verse enabled and posted!");
      }

      case "addverse": {
        const ref = interaction.options.getString("verse");
        const verse = await fetchVerse(ref);
        return interaction.reply(verse ? verse : "❌ Verse not found. Example: John 3:16");
      }

      case "setmemeschannel": {
        memeChannels[interaction.guildId] = interaction.options.getChannel("channel").id;
        save(memeChannelFile, memeChannels);
        return interaction.reply("✅ Meme channel set");
      }

      case "meme": {
        const m = await safeMeme();
        return interaction.reply(m ? { files: [m.url] } : "No meme available");
      }
    }
  } catch (e) {
    console.error(e);
    if (!interaction.replied) interaction.reply("⚠️ Error handled");
  }
});

/* =========================
   JOBS
========================= */
function startJobs() {
  // Daily verse job
  setInterval(async () => {
    for (const g in verseChannels) {
      try {
        const c = await client.channels.fetch(verseChannels[g]);
        if (!c) continue;
        const verse = await randomVerse();
        if (verse) c.send(verse);
      } catch (e) {
        console.error("Verse job error:", e);
      }
    }
  }, 24 * 60 * 60 * 1000); // every 24h

  // Hourly meme job
  setInterval(async () => {
    for (const g in memeChannels) {
      try {
        const c = await client.channels.fetch(memeChannels[g]);
        const m = await safeMeme();
        if (c && m) {
          c.send({ content: "😂 **Hourly Meme**", files: [m.url] });
        }
      } catch (e) {
        console.error("Meme job error:", e);
      }
    }
  }, 60 * 60 * 1000); // every hour
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
