# 🕸️ DARK BOT — Bot WhatsApp profissional com Dashboard

**Bot WhatsApp completo** (Baileys) com **AURA** (assistente IA com personalidade viva), dashboard web, RPG multi-jogador, chamadas VoIP, decrypter de configs e muito mais. Feito para correr no **Render Free** com **MongoDB Atlas** e **UptimeRobot**.

```
WhatsApp ⇄ Baileys ──► commandHandler ──► 1.870 cases
                        │        └──────► AURA (26 módulos: memória, humores,
                        │                   proactividade, voz, regras aprendidas)
        Express + EJS ──┤  Dashboard (21 páginas) + Socket.IO ao vivo
                        └──► MongoDB (16 modelos: sessões, users, RPG, economia…)
UptimeRobot ──/ping (5 min)──► mantém o Render Free acordado
```

---

## ✨ O que ele faz

### 🖤 AURA — a assistente (uma pessoa, não um menu)
- **Conversa como gente**: memória de longo prazo (factos por pessoa), humor próprio, reage com emojis, manda áudio com voz própria (ElevenLabs)
- **Acordada por defeito nos grupos** — fala à vontade com o Dono; qualquer pessoa pode chamá-la ("aura…", menção ou respondendo-lhe); `aura dorme` / `aura acorda` por grupo
- **Executa por conversa**: ~100 comandos por linguagem natural ("aura bane o Zeca", "toca shakira", "fecha o grupo")
- **🎨 ENSINA-SE por conversa (v6.90 Rules Engine)**:
  - `"quando eu disser pizza vc responde UHUL PIZZA"` → responde sempre
  - `"se alguém mandar link avisa a pessoa"` · `"quando alguém disser bom dia reage com ☀️"`
  - `"quando eu mandar a palavra código envia o link do grupo"`
  - `"que regras te ensinei?"` lista · `"cancela a regra do pizza"` apaga
  - Gatilhos: palavra/frase · link · sticker · quem disse (tu ou alguém). Acções: responder · reagir · remover · avisar · link do grupo · apagar. Máx. 20 regras, persistidas no MongoDB
- **🩸 Sticker-ban (v6.89)**: ensina com o sticker citado — *"se eu responder alguém com este sticker de ban vc remove ele"* → a partir daí, responder com o sticker remove a pessoa citada (só o Dono; nunca remove o Dono nem o bot)
- **Proactiva** (onde foi invocada): fala quando quer — conselhos, orações, daily (agenda)
- **Voz**: ouve áudios (AssemblyAI) e fala; entende perguntas por voz
- **Assistente vs AURA**: em modo assistente é profissional e sóbria; acordada é ela própria. A assistente **nunca fica calada**: em grupo sem aluguel avisa como activar (1x/6h por pessoa)

### 📊 Dashboard (`/dashboard`)
Login com sessão cifrada em MongoDB · 21 páginas: estado/QR/pair-code do bot e do VoIP, consola ao vivo (logs/spy por Socket.IO), CRUD de comandos + overrides, broadcast com progresso, agendamentos, utilizadores (premium/free/ban), pagamentos com aprovação, grupos (settings/membros/ban/sair), mídia (Cloudinary), backup export/import, decrypter web, estatísticas, board ao vivo

### 🎮 RPG completo
Criação de personagem **por listas clicáveis** (`!rpgstart` → raças → classes → ficha com bónus) ou escrita (`!rpgstart Nome raça classe`) · combate narrativo · guildas · quests · economia/banco · loja · mundo com estado · comunidades RPG (arena, dungeons, trocas… classified)

### 📦 Mais
1.870 comandos: downloads (YouTube/Redes sociais com fallbacks), stickers (packs, marca de água, rename), música com cartão e capa, jogos, medidores, logos, anti-link/anti-spam/anti-delete, anti-sticker por grupo, decrypter de 15 formatos (EHI, HAT, WireGuard, SSH…), chamadas VoIP com QR/pair próprio, temas do menu, prefixos por grupo…

---

## 🚀 Deploy (Render Free + MongoDB + UptimeRobot)

1. **Fork do repo** → Render: *New → Web Service* → liga ao fork
2. Build: `npm ci --omit=dev` · Start: `node src/index.js` (ou usa o `render.yaml` como Blueprint)
3. **MongoDB Atlas** grátis (M0) → copia a URI para `MONGODB_URI`
4. Variáveis essenciais:

| Var | O quê |
|---|---|
| `MONGODB_URI` | `mongodb+srv://…` (obrigatória em produção) |
| `APP_URL` | `https://teu-servico.onrender.com` |
| `OWNER_USERNAME` / `OWNER_PASSWORD` | login do dono no dashboard (sincroniza no arranque) |
| `OWNER_NUMBER` / `BOT_NUMBER` | números WhatsApp (só dígitos) |
| `SESSION_SECRET` | string aleatória (qualquer formato) |
| `GROQ_API_KEY` e/ou `GEMINI_API_KEY` | activam a Aura com IA (grátis) |
| opcionais | `ELEVENLABS_API_KEY` (voz), `ASSEMBLYAI_API_KEY` (ouvir), `CLOUDINARY_*` (mídia), `TENOR_API_KEY` (gifs) |

5. **UptimeRobot**: monitor HTTP → `https://teu-servico.onrender.com/ping` a cada 5 min (o bot também se auto-pinga a cada 14 min)
6. Abre `/dashboard/connect` → liga o WhatsApp por **QR** ou **código de par**. A sessão fica no MongoDB e **religa sozinha** após cada deploy (auto-start com retry)

### Rotas de saúde
`/ping` (UptimeRobot) · `/health` (liveness) · `/status` (página pública) · `/diag` (diagnóstico real: commit, chaves, conflitos de sessão) · `/test-pv` (testa o PV dentro do processo)

---

## 🧪 Testes

```bash
npm test          # 64 scripts, >1.400 verificações (tudo tem de passar)
npm run sim       # simulador de WhatsApp local (sem rede)
npm run diag      # diagnóstico em produção
```

## 🗂️ Estrutura

```
src/index.js            arranque: Express, Socket.IO, rotas, auto-start
src/bot/whatsapp.js     motor Baileys (QR/pair, backoff, sessão no Mongo)
src/bot/commandHandler  o cérebro (fluxo, permissões, Aura, regras)
src/bot/caseHandler     1.870 cases + cases dinâmicos (!addcase)
src/aura/               26 módulos da AURA (rulesEngine, stickerBan, brain…)
src/bot/rpg/            motor RPG + mundo + criação por seleção
src/routes | views      dashboard (21 páginas) + API (~70 endpoints)
src/database/models     16 modelos Mongoose
src/decrypter/          Dark Net Engine (15 formatos)
scripts/                64 scripts de teste + simulador
```

## 🔒 Notas de segurança
- Comandos destrutivos (`eval`, `broadcast`, `restart`…) **nunca** executam por conversa — só com prefixo escrito
- Regras/sticker-ban: só o Dono ensina e cancela; remoção nunca atinge o Dono nem o bot
- Rate-limits: login, API, regras (cooldown 15s), avisos (6h)

— feito com 🖤 por Dark Net
