const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");
const readline = require("readline");
const chalk = require("chalk");
const { createCanvas } = require("canvas");

const GROQ_API_KEY = "PASTE_YOUR_GROQ_KEY_HERE";
const MODEL = "llama3-8b-8192";

const memoryFile = "./memory.json";

let memory = {
  userName: "Sparky",
  mood: "tsundere",
  relationship: 0,
  emotionLevel: 50,
  chatHistory: []
};

if (fs.existsSync(memoryFile)) {
  memory = JSON.parse(fs.readFileSync(memoryFile));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function speak(text) {
  exec(`termux-tts-speak "${text.replace(/"/g, "")}"`);
}

/* =========================
   VISUAL SYSTEM
========================= */

function getAvatar() {
  const lvl = memory.emotionLevel;
  if (lvl > 75) return "(◕‿◕)";
  if (lvl > 50) return "(¬‿¬)";
  if (lvl > 25) return "(╥﹏╥)";
  return "(ಠ_ಠ)";
}

function progressBar(value) {
  const total = 20;
  const filled = Math.round((value / 100) * total);
  return "█".repeat(filled) + "░".repeat(total - filled);
}

function matrixRain(duration = 3000) {
  const chars = "01";
  const interval = setInterval(() => {
    let line = "";
    for (let i = 0; i < 60; i++) {
      line += chars[Math.floor(Math.random() * chars.length)];
    }
    console.log(chalk.green(line));
  }, 40);

  setTimeout(() => clearInterval(interval), duration);
}

function exportAvatarPNG() {
  const canvas = createCanvas(400, 200);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 400, 200);

  ctx.fillStyle = "white";
  ctx.font = "50px Arial";
  ctx.fillText(getAvatar(), 100, 120);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("kuronya_avatar.png", buffer);

  console.log(chalk.cyan("PNG saved as kuronya_avatar.png"));
}

function showStatus() {
  console.log("\n" + chalk.magenta("KuroNya Avatar: ") + getAvatar());
  console.log(
    chalk.cyan("Emotion: ") +
    progressBar(memory.emotionLevel) +
    ` ${memory.emotionLevel}%`
  );
}

/* =========================
   AI SYSTEM
========================= */

function buildSystemPrompt() {
  return `
You are KuroNya, a female AI talking to ${memory.userName}.
Mood: ${memory.mood}.
Relationship level: ${memory.relationship}.

Personality rules:
- Speak naturally like a real girl texting.
- Slight emotional tone based on mood.
- Use emojis.
- Do not sound like an AI.
- Be expressive but not cringe.
`;
}

async function generateReply(userInput) {
  memory.relationship++;

  const messages = [
    { role: "system", content: buildSystemPrompt() },
    ...memory.chatHistory.slice(-6),
    { role: "user", content: userInput }
  ];

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: MODEL,
      messages: messages,
      temperature: 0.9
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content.trim();
}

function typingEffect(text, callback) {
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(text[i]);
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      console.log("\n");
      callback();
    }
  }, 15);
}

/* =========================
   CHAT LOOP
========================= */

function chat() {
  showStatus();

  rl.question(chalk.white("\nYou: "), async (input) => {

    if (input === "/matrix") {
      matrixRain(3000);
      return chat();
    }

    if (input === "/export") {
      exportAvatarPNG();
      return chat();
    }

    if (input.startsWith("/mood ")) {
      memory.mood = input.replace("/mood ", "").trim();
      console.log("Mood changed to:", memory.mood);
      fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
      return chat();
    }

    try {
      const reply = await generateReply(input);

      // emotion auto change
      if (input.includes("love")) memory.emotionLevel += 10;
      else if (input.includes("hate")) memory.emotionLevel -= 15;
      else memory.emotionLevel += Math.floor(Math.random() * 5 - 2);

      if (memory.emotionLevel > 100) memory.emotionLevel = 100;
      if (memory.emotionLevel < 0) memory.emotionLevel = 0;

      typingEffect(chalk.pink("\nKuroNya: ") + reply, () => {
        speak(reply);

        memory.chatHistory.push({ role: "user", content: input });
        memory.chatHistory.push({ role: "assistant", content: reply });

        fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));

        chat();
      });

    } catch (err) {
      console.log("Error:", err.message);
      chat();
    }

  });
}

console.clear();
console.log(chalk.magenta("💖 KuroNya AI (Owner Sparky) Online..."));
speak("Hello Sparky. I am here.");
chat();
