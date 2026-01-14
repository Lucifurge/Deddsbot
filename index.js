require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const express = require("express");
const axios = require("axios");

// ============================
// EXPRESS (Keep Alive for Render)
// ============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("📖 Dedd's Official Discord Bot is running!");
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ============================
// DISCORD CLIENT
// ============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================
// HELPER FUNCTIONS
// ============================
async function getRandomVerse() {
  const res = await axios.get("https://bible-api.com/?random=verse");
  return res.data;
}

async function getVerse(reference) {
  const res = await axios.get(
    `https://bible-api.com/${encodeURIComponent(reference)}`
  );
  return res.data;
}

// ============================
// STORE DAILY VERSE CHANNEL
// ============================
// In memory (reset on restart). For persistent storage, you can use a database.
let dailyVerseChannelId = null;

// ============================
// SLASH COMMAND SETUP
// ============================
const commands = [
  new SlashCommandBuilder()
    .setName("verse")
    .setDescription("Get a Bible verse")
    .addStringOption(option =>
      option.setName("reference")
        .setDescription("Optional: specify a verse, e.g. John 3:16")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is online"),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Bot repeats your message")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message for the bot to say")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setdailychannel")
    .setDescription("Set the channel for daily Bible verses")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("The channel where daily verses will be sent")
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), 
      { body: commands },
    );
    console.log("✅ Slash commands registered");
  } catch (error) {
    console.error(error);
  }
})();

// ============================
// COMMAND HANDLER
// ============================
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  // ---------- Bible Commands ----------
  if (interaction.commandName === "verse") {
    const reference = interaction.options.getString("reference");

    try {
      let verseData;
      if (reference) {
        verseData = await getVerse(reference);
      } else {
        verseData = await getRandomVerse();
      }
      await interaction.reply(`📖 **${verseData.reference}**\n${verseData.text}`);
    } catch (error) {
      await interaction.reply("⚠️ Could not find that verse. Try `John 3:16`");
    }
  }

  // ---------- Basic Discord Commands ----------
  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong! I'm online and ready!");
  }

  if (interaction.commandName === "say") {
    const msg = interaction.options.getString("message");
    await interaction.reply(msg);
  }

  // ---------- Daily Verse Commands ----------
  if (interaction.commandName === "setdailychannel") {
    const channel = interaction.options.getChannel("channel");
    dailyVerseChannelId = channel.id;
    await interaction.reply(`✅ Daily Bible verses will be sent to ${channel}`);
  }
});

// ============================
// DAILY VERSE SENDER
// ============================
// Check every hour and send verse if channel is set
setInterval(async () => {
  if (!dailyVerseChannelId) return;

  try {
    const verse = await getRandomVerse();
    const channel = await client.channels.fetch(dailyVerseChannelId);
    channel.send(`📖 **Daily Verse**\n**${verse.reference}**\n${verse.text}`);
  } catch (err) {
    console.error("Failed to send daily verse:", err);
  }
}, 60 * 60 * 1000); // every 1 hour (can adjust as needed)

// ============================
// LOGIN
// ============================
client.login(process.env.TOKEN);
