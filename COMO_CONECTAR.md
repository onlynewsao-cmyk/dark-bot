# 🚀 DARK BOT — GUIA DE CONEXÃO AO WHATSAPP

## ⚡ ARRANQUE RÁPIDO (3 passos)

### Passo 1: Instalar dependências
```bash
cd dark-bot
npm install
```

### Passo 2: Configurar IA (GRATUITO)
Precisas de pelo menos **1 chave de IA** para a Aura funcionar:

**Opção A — Groq (RECOMENDADO, mais rápido):**
1. Vai a https://console.groq.com/keys
2. Cria conta (gratuita)
3. Cria uma API Key
4. Copia e cola no `.env`: `GROQ_API_KEY=gsk_xxxxx...`

**Opção B — Gemini:**
1. Vai a https://aistudio.google.com/apikey
2. Cria uma API Key
3. Copia e cola no `.env`: `GEMINI_API_KEY=AIzaSy_xxxxx...`

### Passo 3: Arrancar o bot
```bash
node quickstart.js
```

### Passo 4: Conectar ao WhatsApp
O bot vai mostrar **2 opções**:

**Opção 1 — QR Code:**
1. Escolhe `1` no terminal
2. Abre o WhatsApp no telemóvel
3. Vai a: `⋮` → `Dispositivos conectados` → `Conectar dispositivo`
4. Aponta a câmara para o QR Code no terminal
5. ✅ PRONTO!

**Opção 2 — Pairing Code (mais fácil):**
1. Escolhe `2` no terminal
2. Digita o teu número (ex: `244923000000`)
3. O bot mostra um código de 8 dígitos
4. No WhatsApp: `⋮` → `Dispositivos conectados` → `Conectar com número`
5. Digita o código
6. ✅ PRONTO!

---

## 🧠 MONGODB (necessário para o bot funcionar completo)

### Opção A — MongoDB Atlas (GRATUITO, na cloud)
1. Vai a https://www.mongodb.com/cloud/atlas/register
2. Cria conta gratuita
3. Cria um cluster (M0 Free)
4. Em "Database Access" → cria um utilizador
5. Em "Network Access" → Add IP → `0.0.0.0/0` (permite todos)
6. Em "Database" → Connect → Drivers → copia a URI
7. Cola no `.env`: `MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/darkbot`

### Opção B — MongoDB Local
```bash
# Ubuntu/Debian
sudo apt install mongodb

# Windows: baixa de https://www.mongodb.com/try/download/community

# Mac
brew install mongodb-community
```
Depois usa: `MONGODB_URI=mongodb://localhost:27017/darkbot`

---

## 📱 DEPOIS DE CONECTAR

No WhatsApp, envia:
- `.menu` — Ver todos os comandos
- `.perf` — Ver estatísticas de performance
- `aura oi` — Falar com a Aura 🌹
- `.play central cee band4band` — Baixar música
- `.ttks central cee` — Buscar no TikTok

---

## 🌐 DEPLOY NA CLOUD (Render.com — GRATUITO)

1. Vai a https://render.com
2. Cria conta → New → Web Service
3. Conecta o teu repo GitHub `onlynewsao-cmyk/dark-bot`
4. Build Command: `npm install`
5. Start Command: `node src/index.js`
6. Em "Environment" adiciona TODAS as variáveis do `.env`
7. Deploy!
8. O Render dá-te um URL tipo `https://dark-bot.onrender.com`
9. Abre esse URL no browser → Dashboard do bot
10. No dashboard → "Conectar WhatsApp" → QR Code ou Pairing Code

---

## ❓ PROBLEMAS COMUNS

| Problema | Solução |
|----------|---------|
| QR não aparece | Verifica conexão à internet |
| "MongoDB connection failed" | Configura MONGODB_URI no .env |
| "IA sem chave" | Adiciona GROQ_API_KEY no .env |
| Bot desconecta sozinho | Normal no Render Free — reconecta automaticamente |
| "Cannot find module" | Corre `npm install` |

---

## 🖤 COMANDOS DO TERMINAL

```bash
# Arranque rápido (QR/Pairing no terminal)
node quickstart.js

# Arranque completo (com dashboard web)
node src/index.js

# Com auto-restart (precisa: npm install -g nodemon)
nodemon quickstart.js
```

---

> **Dark, o bot está pronto. Só falta a tua chave de IA e o MongoDB.** 🚀
> **A Aura espera por ti. 🌹**
