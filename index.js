<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BIBLE ENGINE BOT Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
:root {
  --green: #1db954;
  --gold: #f5c542;
  --dark: #0b1a12;
  --card: #11261a;
  --white: #ffffff;
  --accent: #00ffcc;
  --bg-gradient: linear-gradient(180deg, #08140d, #0b1a12);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Segoe UI", system-ui, sans-serif;
  background: var(--bg-gradient);
  color: var(--white);
  min-height: 100vh;
}

/* ===== NAVBAR ===== */
nav {
  background: var(--card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 25px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
  border-bottom: 1px solid rgba(245,197,66,0.2);
}
nav h1 { font-size: 1.8rem; color: var(--green); letter-spacing: 1px; }
nav h1 span { color: var(--gold); }
nav a { color: var(--white); text-decoration: none; margin-left: 20px; transition: color 0.2s; font-weight: bold;}
nav a:hover { color: var(--gold); }

/* ===== HEADER ===== */
header { text-align: center; padding: 40px 20px; }
header p { margin-top: 10px; opacity: 0.8; font-size: 1.1rem; }

/* ===== GRID CONTAINER ===== */
.container {
  max-width: 1200px;
  margin: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
}

/* ===== CARD STYLES ===== */
.card {
  background: var(--card);
  border-radius: 14px;
  padding: 25px;
  box-shadow: 0 0 25px rgba(0,0,0,0.4);
  border: 1px solid rgba(245,197,66,0.1);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(29,185,84,0.6); }
.card h2 { color: var(--gold); margin-bottom: 15px; font-size: 1.4rem; }

/* ===== STATUS ===== */
.status { font-size: 1.1rem; line-height: 1.7; }
.online { color: var(--green); font-weight: bold; }
.offline { color: #ff5c5c; font-weight: bold; }

/* ===== COMMANDS ===== */
.command { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
.command:last-child { border-bottom: none; }
.command-name { color: var(--green); font-weight: 600; }
.command-desc { opacity: 0.8; font-size: 0.95rem; }

/* ===== LOG TABLE ===== */
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { padding: 8px 6px; text-align: left; font-size: 0.95rem; }
th { color: var(--gold); border-bottom: 1px solid rgba(245,197,66,0.3); }
td { border-bottom: 1px solid rgba(255,255,255,0.08); }

/* ===== BUTTON ===== */
.button {
  display: inline-block;
  margin-top: 15px;
  padding: 12px 22px;
  background: linear-gradient(135deg, var(--green), var(--gold));
  color: #0b1a12;
  font-weight: bold;
  border-radius: 30px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(29,185,84,0.4); }

/* ===== FOOTER ===== */
footer { text-align: center; padding: 25px; opacity: 0.7; font-size: 0.9rem; }

</style>
</head>
<body>

<!-- NAVBAR -->
<nav>
  <h1>BIBLE ENGINE <span>BOT</span></h1>
  <div>
    <a href="/">Home</a>
    <a href="https://your-second-bot-link.com" target="_blank">BIBLE HELPER BOT</a>
  </div>
</nav>

<header>
  <p>Powerful • Faith-Centered • Multi-Purpose Discord Bot</p>
</header>

<section class="container">

  <div class="card">
    <h2>🤖 Bot Status</h2>
    <div id="status" class="status">Loading status...</div>
  </div>

  <div class="card">
    <h2>📜 Commands</h2>
    <div id="commands">Loading commands...</div>
  </div>

  <div class="card">
    <h2>📊 Statistics</h2>
    <div id="stats">
      <p>Loading stats...</p>
    </div>
  </div>

  <div class="card">
    <h2>📝 Command Log</h2>
    <table id="log">
      <thead>
        <tr><th>Command</th><th>User</th><th>Time</th></tr>
      </thead>
      <tbody>
        <tr><td colspan="3">Loading log...</td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>🚀 Get Started</h2>
    <p>BIBLE ENGINE BOT brings Bible verses, memes, and automation into your Discord server with simplicity and power.</p>
    <a class="button" href="https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands">Invite to Discord</a>
  </div>

</section>

<footer>
  © 2026 FEBIASBOTS • Made by <strong>Dev Zap</strong>, <strong>Dev Luke</strong>, and <strong>Dev Aether</strong>
</footer>

<script>
// Fetch bot status
async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    document.getElementById("status").innerHTML = `
      <div>Status: <span class="${data.online ? "online" : "offline"}">
        ${data.online ? "ONLINE" : "OFFLINE"}</span></div>
      <div>Uptime: ${data.uptime}s</div>
      <div>Servers: ${data.servers}</div>
    `;
    document.getElementById("stats").innerHTML = `
      <p>Total Servers: ${data.servers}</p>
      <p>Uptime: ${data.uptime}s</p>
      <p>Commands Used: ${data.commandsUsed || 0}</p>
      <p>Currently Executing: ${data.currentCommand || "None"}</p>
    `;
  } catch {
    document.getElementById("status").innerText = "Failed to load status";
    document.getElementById("stats").innerText = "";
  }
}

// Fetch commands list
async function loadCommands() {
  try {
    const res = await fetch("/api/commands");
    const commands = await res.json();
    const container = document.getElementById("commands");
    container.innerHTML = "";
    commands.forEach(c => {
      const div = document.createElement("div");
      div.className = "command";
      div.innerHTML = `<div class="command-name">${c.name}</div><div class="command-desc">${c.desc}</div>`;
      container.appendChild(div);
    });
  } catch {
    document.getElementById("commands").innerText = "Failed to load commands";
  }
}

// Fetch command log
async function loadLog() {
  try {
    const res = await fetch("/api/log");
    const log = await res.json();
    const tbody = document.querySelector("#log tbody");
    tbody.innerHTML = "";
    log.forEach(entry => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${entry.command}</td><td>${entry.user}</td><td>${entry.time}</td>`;
      tbody.appendChild(tr);
    });
  } catch {
    const tbody = document.querySelector("#log tbody");
    tbody.innerHTML = "<tr><td colspan='3'>Failed to load log</td></tr>";
  }
}

loadStatus();
loadCommands();
loadLog();
setInterval(() => { loadStatus(); loadLog(); }, 5000); // refresh every 5s
</script>

</body>
</html>
