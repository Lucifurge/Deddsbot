require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const axios = require("axios");

// ============================
// EXPRESS SERVER (RENDER)
// ============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("📖 Bible Discord Bot is running!");
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

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ============================
// BIBLE API FUNCTIONS
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
// MESSAGE COMMAND HANDLER
// ============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // !verse (random)
  if (message.content === "!verse") {
    try {
      const verse = await getRandomVerse();
      await message.reply(
        `📖 **${verse.reference}**\n${verse.text}`
      );
    } catch (error) {
      message.reply("⚠️ Unable to fetch a verse right now.");
    }
  }

  // !verse John 3:16
  if (message.content.startsWith("!verse ")) {
    const reference = message.content.slice(7);

    try {
      const verse = await getVerse(reference);
      await message.reply(
        `📖 **${verse.reference}**\n${verse.text}`
      );
    } catch (error) {
      message.reply(
        "⚠️ Verse not found. Example: `!verse John 3:16`"
      );
    }
  }
});

// ============================
// BOT LOGIN
// ============================
client.login(process.env.TOKEN);
