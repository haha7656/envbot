const { Client, GatewayIntentBits } = require("discord.js");
const { spawn } = require("child_process");
const fs = require("fs");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const PREFIX = ".";
const TOKEN = "PUT_YOUR_TOKEN_HERE";

// OPTIONAL: lock to yourself
// const ALLOWED_USERS = ["YOUR_DISCORD_ID"];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function stripCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, "").trim();
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  // if (ALLOWED_USERS && !ALLOWED_USERS.includes(message.author.id)) return;

  const cmd = message.content.split(/\s+/)[0].slice(1);
  if (cmd !== "deobf") return;

  let source = "";

  // Attachment priority
  if (message.attachments.size > 0) {
    const file = message.attachments.first();
    const res = await fetch(file.url);
    source = await res.text();
  } else {
    source = stripCodeBlocks(message.content.replace(/^\.deobf/, ""));
  }

  if (!source || source.length < 5) {
    return message.reply({
      files: [{
        attachment: Buffer.from("No readable input provided."),
        name: "result.txt"
      }]
    });
  }

  // Write input
  fs.writeFileSync("sandbox/input.lua", source);
  if (fs.existsSync("sandbox/dumped_output.lua"))
    fs.unlinkSync("sandbox/dumped_output.lua");

  const proc = spawn("lua", ["lua/runner.lua"]);

  let stdout = "";
  let stderr = "";

  proc.stdout.on("data", d => stdout += d.toString());
  proc.stderr.on("data", d => stderr += d.toString());

  // HARD TIMEOUT
  const killer = setTimeout(() => {
    proc.kill("SIGKILL");
  }, 8000);

  proc.on("close", () => {
    clearTimeout(killer);

    let output = "";

    if (fs.existsSync("sandbox/dumped_output.lua")) {
      output = fs.readFileSync("sandbox/dumped_output.lua", "utf8");
    } else {
      output =
        "NO OUTPUT GENERATED\n\nSTDOUT:\n" +
        stdout +
        "\nSTDERR:\n" +
        stderr;
    }

    if (output.length > 6_000_000) {
      output = output.slice(0, 6_000_000) + "\n\n[TRUNCATED]";
    }

    fs.writeFileSync("sandbox/result.txt", output);

    message.reply({
      files: [{
        attachment: fs.readFileSync("sandbox/result.txt"),
        name: "result.txt"
      }]
    });
  });
});

client.login(TOKEN);
