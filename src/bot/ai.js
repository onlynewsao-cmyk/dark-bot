const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config');
const mediaHandler = require('./mediaHandler');

/**
 * MOTOR DE IA SUPREMO - DARK ENGINE
 * Prioridade: Gemini (Env) > Groq (Env) > Pollinations (Public)
 */
async function chat(prompt, systemContext = "") {
  const config = require('../config');
  const system = systemContext || `Você é o ${config.bot.name}, assistente pessoal de ${config.owner.name}. Responda de forma direta, inteligente e use emojis.`;

  // 1. TENTA GEMINI (Prioridade Máxima)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(`${system}\n\nUsuário: ${prompt}`);
      const text = result.response.text();
      if (text) return text.trim();
    } catch (e) { console.error('[AI] Gemini Error:', e.message); }
  }

  // 2. TENTA GROQ
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt }
          ]
        })
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
    } catch (e) { console.error('[AI] Groq Error:', e.message); }
  }

  // 3. FALLBACK POLLINATIONS (Público)
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=openai`;
    const res = await fetch(url);
    const text = await res.text();
    if (text) return text.trim();
  } catch (e) {}

  return "🤖 *IA ocupada.* Tente novamente em instantes.";
}

async function generateImage(prompt) {
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`;
    const buf = await mediaHandler.fetchBuffer(url);
    return buf;
  } catch (e) {
    throw new Error("Falha ao gerar imagem.");
  }
}

module.exports = { chat, generateImage };
