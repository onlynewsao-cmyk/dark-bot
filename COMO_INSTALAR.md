# 🚀 COMO INSTALAR O DARK BOT — Guia Express

## 📦 O que você tem aqui

✅ **DARK-BOT-COMPLETO.zip** (128KB) — Workspace inteiro, pronto para upload
✅ **83 arquivos**: bot completo + dashboard + decrypter + jogos + economia
✅ **161 comandos** no WhatsApp
✅ Pronto para **Render Free + GitHub**

---

## 🎯 PASSO 1: Baixar o ZIP

No painel desta conversa, baixe o arquivo:
```
dark-bot/DARK-BOT-COMPLETO.zip
```

Extraia em uma pasta no seu computador. Você verá a estrutura:
```
dark-bot/
├── src/
├── package.json
├── render.yaml
├── README.md
└── ... (83 arquivos)
```

---

## 🎯 PASSO 2: Subir para o GitHub

### 🅰️ Opção fácil — Via Navegador (recomendado se você apagou o repo)

1. Vá para 👉 https://github.com/new
2. **Repository name:** `dark-bot`
3. Marque **Public** (o `.env` está no `.gitignore`, suas senhas não vão)
4. ❌ **NÃO** marque "Add a README file"
5. Clique **Create repository**

6. Na próxima tela do GitHub, clique em **"uploading an existing file"**
7. **Arraste TUDO** que está dentro da pasta `dark-bot/` (não a pasta, o conteúdo dela):
   - 📁 `src/` (pasta inteira)
   - 📄 `package.json`
   - 📄 `package-lock.json` (se tiver)
   - 📄 `README.md`
   - 📄 `render.yaml`
   - 📄 `.gitignore`
   - 📄 `.env.example`
   - 📄 `COMO_INSTALAR.md`

> ⚠️ **NÃO suba**: `.env`, `node_modules/`, `data/`, `DARK-BOT-COMPLETO.zip`

8. Embaixo escreva: `🚀 DARK BOT v5.0 completo`
9. Clique **Commit changes**

### 🅱️ Opção Git (terminal)

```bash
cd dark-bot
git init
git add .
git commit -m "🚀 DARK BOT v5.0 completo"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/dark-bot.git
git push -u origin main
```

---

## 🎯 PASSO 3: Deploy no Render

1. Acesse 👉 https://dashboard.render.com
2. **+ New** → **Web Service**
3. Conecte seu GitHub e selecione `dark-bot`
4. Configurações:
   - **Name:** `dark-bot`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` ✅

5. Adicione as **Environment Variables** (a seção "Advanced" no final):

```
NODE_ENV               = production
PORT                   = 3000
SESSION_SECRET         = DarkBot_S3cr3t_K3y_DarkNet_2026_xyz789_aleatorio_super_seguro
OWNER_NAME             = Dark Net
OWNER_NUMBER           = 244945280380
BOT_NAME               = DARK BOT
BOT_NUMBER             = 244949926074
OWNER_USERNAME         = darknet
OWNER_PASSWORD         = DarkNet@2026
MONGODB_URI            = mongodb+srv://darkbot:Ik9499mVyRvpgRWt@cluster0.yzpwymq.mongodb.net/darkbot?retryWrites=true&w=majority&appName=Cluster0
CLOUDINARY_CLOUD_NAME  = dvnmvvego
CLOUDINARY_API_KEY     = 121927124459388
CLOUDINARY_API_SECRET  = DrxzDxQph4XE_ZjlZPRYIfl3ha8
APP_URL                = https://dark-bot.onrender.com
```

> 🧠 **IA opcional** — Se quiser ativar IA grátis, adicione também:
> ```
> GROQ_API_KEY = (pegue em https://console.groq.com)
> GEMINI_API_KEY = (pegue em https://aistudio.google.com)
> ```

6. Clique **Create Web Service**
7. ⏳ Aguarde **3-5 min** o build/deploy
8. Quando aparecer `🚀 DARK BOT rodando` nos logs → **TÁ NO AR!**

---

## 🎯 PASSO 4: Conectar o WhatsApp

1. Acesse a URL do seu bot (ex: `https://dark-bot.onrender.com`)
2. Faça login:
   - **Usuário:** `darknet`
   - **Senha:** a que você colocou em `OWNER_PASSWORD`
3. Menu lateral → **🔌 Conectar Bot**
4. Clique **Gerar QR Code** ou **Gerar Pair Code**
5. Escaneie pelo WhatsApp → ⚙️ → Aparelhos conectados
6. ✅ **Bot online!**

---

## 🎯 PASSO 5: Manter o bot 24/7 (anti-sleep)

Render Free dorme após 15min. Para manter ativo:

1. https://uptimerobot.com → conta grátis
2. **+ Add New Monitor** → HTTP(s)
3. URL: `https://dark-bot.onrender.com/health`
4. Interval: **5 minutes**
5. Save → pronto, bot online 24/7! 🎉

---

## 📋 ESTRUTURA DOS ARQUIVOS

```
dark-bot/
├── package.json              # Dependências
├── render.yaml               # Config Render
├── .env.example              # Modelo de variáveis
├── .gitignore                # Arquivos ignorados
├── README.md                 # Apresentação
├── COMO_INSTALAR.md          # Este guia
│
└── src/
    ├── index.js              # 🚀 Entry point
    ├── config.js             # Config global
    │
    ├── bot/                  # 🤖 Lógica WhatsApp (Baileys)
    │   ├── whatsapp.js
    │   ├── commandHandler.js
    │   ├── nativeCommands.js
    │   ├── mongoAuthState.js (sessão persistente)
    │   ├── messageListener.js (anti-delete + espião)
    │   ├── stickerMaker.js
    │   ├── mediaHandler.js
    │   ├── downloader.js     (YouTube, TikTok, IG, etc)
    │   ├── ai.js             (Groq + Gemini)
    │   ├── antiSpam.js
    │   ├── groupEvents.js    (boas-vindas)
    │   ├── scheduler.js      (agendamentos)
    │   └── packages/         # 📦 Pacotes de comandos
    │       ├── interactions.js  (35 cmds)
    │       ├── family.js        (8 cmds)
    │       ├── economy.js       (18 cmds)
    │       ├── games.js         (16 cmds)
    │       └── cheats.js        (18 cmds dono)
    │
    ├── decrypter/            # 🔓 VPN Decrypter
    │   ├── index.js
    │   ├── formatter.js
    │   └── formats/          (HTTP Injector, HA Tunnel,
    │                          NPV, NetMod, WireGuard, etc)
    │
    ├── database/
    │   ├── connection.js
    │   └── models/           # 11 modelos MongoDB
    │
    ├── routes/               # Express routes
    │   ├── auth.js
    │   ├── dashboard.js
    │   └── api.js
    │
    ├── middleware/
    │   └── auth.js
    │
    ├── views/                # EJS templates
    │   ├── auth/             (login, register)
    │   ├── dashboard/        (16 páginas)
    │   └── partials/
    │
    └── public/               # CSS + JS frontend
        ├── css/style.css
        └── js/app.js
```

---

## 🆘 PROBLEMAS COMUNS

### "Build failed: Cannot find module"
→ Confirme que `package.json` está na raiz do repo.

### "MongooseServerSelectionError"
→ No MongoDB Atlas → Network Access → libere `0.0.0.0/0` (todos IPs).

### "Application failed to respond"
→ Aguarde 1-2 min após deploy. Render demora a "acordar" o serviço.

### "QR Code não aparece"
→ Vá na página `/dashboard/console` para ver os logs em tempo real.

### Bot desconecta sozinho a cada 15min
→ Configure o **UptimeRobot** (passo 5 acima).

---

## 🎉 ESTATÍSTICAS DO PROJETO

```
📊 83 arquivos
📦 161 comandos WhatsApp
🎨 16 páginas de dashboard
🔓 13 formatos VPN decryptados
💾 11 modelos MongoDB
🌐 100% Render Free compatible
```

---

## 📞 SUPORTE

Se travar em qualquer passo, é só me avisar com:
1. Qual etapa (1, 2, 3, 4 ou 5)
2. A mensagem de erro exata
3. Print/foto se ajudar

E eu te ajudo na hora! 💜

---

**Bom deploy! 🚀⚡**
