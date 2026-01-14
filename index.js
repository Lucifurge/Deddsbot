require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

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
  try {
    const res = await axios.get("https://bible-api.com/?random=verse", { timeout: 5000 });
    return res.data;
  } catch (err) {
    console.error("Bible API error:", err.message);
    return { reference: "Error", text: "Could not fetch verse." };
  }
}

async function getVerse(reference) {
  try {
    const res = await axios.get(`https://bible-api.com/${encodeURIComponent(reference)}`, { timeout: 5000 });
    return res.data;
  } catch (err) {
    console.error("Bible API error:", err.message);
    return { reference: "Error", text: "Could not fetch verse. Check your reference." };
  }
}

// ============================
// PERSISTENT DAILY CHANNEL STORAGE
// ============================
const dataFile = path.join(__dirname, "dailyChannels.json");
let dailyChannels = {};

// Load channels from file
if (fs.existsSync(dataFile)) {
  try {
    dailyChannels = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch {
    dailyChannels = {};
  }
}

// Save channels to file
function saveChannels() {
  fs.writeFileSync(dataFile, JSON.stringify(dailyChannels, null, 2));
}

// ============================
// SLASH COMMANDS
// ============================
const commands = [
  new SlashCommandBuilder()
    .setName("verse")
    .setDescription("Get a Bible verse")
    .addStringOption(opt => opt.setName("reference").setDescription("e.g. John 3:16").setRequired(false)),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is online"),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Bot repeats your message")
    .addStringOption(opt => opt.setName("message").setDescription("Message to repeat").setRequired(true)),

  new SlashCommandBuilder()
    .setName("setdailychannel")
    .setDescription("Set the channel for daily Bible verses")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel for daily verse").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log("🔄 Registering commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Commands registered");
  } catch (err) {
    console.error(err);
  }
})();

// ============================
// COMMAND HANDLER
// ============================
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const guildId = interaction.guildId;

  try {
    if (interaction.commandName === "verse") {
      const reference = interaction.options.getString("reference");
      const verse = reference ? await getVerse(reference) : await getRandomVerse();
      await interaction.reply(`📖 **${verse.reference}**\n${verse.text}`);
    }

    if (interaction.commandName === "ping") {
      await interaction.reply("🏓 Pong! I'm online!");
    }

    if (interaction.commandName === "say") {
      const msg = interaction.options.getString("message");
      await interaction.reply(msg);
    }

    if (interaction.commandName === "setdailychannel") {
      const channel = interaction.options.getChannel("channel");
      dailyChannels[guildId] = channel.id;
      saveChannels();
      await interaction.reply(`✅ Daily Bible verses will be sent to ${channel}`);
    }
  } catch (err) {
    console.error("Command error:", err);
    await interaction.reply("⚠️ Something went wrong while executing this command.");
  }
});

// ============================
// DAILY VERSE SENDER
// ============================
setInterval(async () => {
  for (const guildId in dailyChannels) {
    const channelId = dailyChannels[guildId];
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) continue;

      const verse = await getRandomVerse();
      await channel.send(`📖 **Daily Verse**\n**${verse.reference}**\n${verse.text}`);
    } catch (err) {
      console.error(`Failed sending daily verse to guild ${guildId}:`, err.message);
    }
  }
}, 60 * 60 * 1000); // every 1 hour (can set 24h)

// ============================
// LOGIN
// ============================
client.login(process.env.TOKEN);
