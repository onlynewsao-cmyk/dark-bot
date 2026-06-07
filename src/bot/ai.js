const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config');
const mediaHandler = require('./mediaHandler');

/**
 * MOTOR DE IA SUPREMO - DARK ENGINE
 * Prioridade: Gemini (Env) > Groq (Env) > Pollinations (Public)
 */
async function chat(prompt, systemContext = "") {
  const system = systemContext || `Você é o ${config.bot.name}, assistente pessoal de ${config.owner.name}. Responda de forma direta, inteligente e use emojis.`;

  // 1. TENTA GEMINI (Se configurado no Render)
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`${system}\n\nUsuário: ${prompt}`);
      const response = await result.response;
      return response.text().trim();
    } catch (e) { console.error('[AI] Gemini Error:', e.message); }
  }

  // 2. TENTA GROQ (Se configurado no Render)
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt }
          ]
        })
      });
      const data = await res.json();
      return data.choices[0].message.content.trim();
    } catch (e) { console.error('[AI] Groq Error:', e.message); }
  }

  // 3. FALLBACK POLLINATIONS (Sempre Online)
  try {
    const res = await mediaHandler.fetchJson(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=openai`);
    if (typeof res === 'string') return res.trim();
    return res.content || res.result || "Estou processando sua pergunta...";
  } catch (e) {
    return "❌ Todas as IAs estão ocupadas no momento. Tente novamente em 1 minuto.";
  }
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
