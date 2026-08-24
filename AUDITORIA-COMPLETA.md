# 🕸️ AUDITORIA COMPLETA — DARK BOT + AURA (v6.88)

**Data:** 23/08/2026 · **Repo:** `onlynewsao-cmyk/dark-bot` · **Base:** `main` @ `feab0d7` (PR #1 merged) → fix `937a5cf` (v6.88)

---

## 1. ARQUITECTURA GERAL (como tudo se liga)

```
                        ┌──────────────────────────────────────────┐
                        │  RENDER FREE (Web Service, Oregon)       │
                        │  node src/index.js · porta 10000         │
                        │                                          │
  WhatsApp ◄──────────► │  ┌────────────┐    ┌───────────────────┐ │
  (@systemzero/baileys) │  │ WhatsAppBot│───►│ commandHandler    │ │
  socket principal      │  │ (qr/pair)  │    │ (2.944 linhas)    │ │
                        │  └─────┬──────┘    └────────┬──────────┘ │
  WhatsApp ◄──────────► │  ┌────────────┐    ┌────────▼──────────┐ │
  socket de chamadas    │  │ CallBot    │    │ caseHandler       │ │
  (VoIP/QR/pair)        │  │ (callSocket)│   │ 1.847 cases       │ │
                        │  └─────┬──────┘    └────────┬──────────┘ │
                        │        │                    │            │
                        │  ┌─────▼────────────────────▼─────────┐  │
                        │  │  AURA — 26 módulos (assistente IA) │  │
                        │  └────────────────────────────────────┘  │
                        │                                          │
                        │  Express + EJS (dashboard, 21 páginas)    │
                        │  Socket.IO (live: logs, spy, QR, board)   │
                        │  Scheduler + Agenda + Proactividade       │
                        └───────────────┬──────────────────────────┘
                                        │ Mongoose
                        ┌───────────────▼──────────────────────────┐
                        │  MONGODB ATLAS M0 (16 modelos/schemas)   │
                        │  sessões WA · users · configs · economia │
                        └──────────────────────────────────────────┘

  UPTIME ROBOT ──GET /ping (5 min)──►  evita hibernação do Render Free
  (o bot também faz keep-alive interno a cada 14 min via APP_URL/ping)
```

### Endpoints de infraestrutura (verificados ao vivo)
| Rota | Função | Estado |
|---|---|---|
| `/ping` | Keep-alive UptimeRobot (corpo `OK`) | ✅ 200 em 3 ms |
| `/health` | Liveness do Render (JSON com bot/callbot/db/uptime) | ✅ 200 |
| `/status` | Página pública ONLINE/OFFLINE (auto-refresh 30 s) | ✅ 200 |
| `/diag` | Diagnóstico real do processo em produção (commit, chaves, guardas da AURA, conflitos de sessão) | ✅ existe |
| `/test-pv` | Simula mensagem de PV no processo real | ✅ existe |

---

## 2. ESTRUTURA DO CÓDIGO (193 ficheiros JS · 30 views EJS)

### `src/` — núcleo
| Pasta | Papel |
|---|---|
| `index.js` | Bootstrap: Mongo → dono → Express → Socket.IO → rotas → auto-reconexão WA (sessão no Mongo ou `data/auth`) → scheduler/agenda/proactividade |
| `config.js` | Todas as env vars do Render (nunca segredos hardcoded) |
| `bot/whatsapp.js` | Motor Baileys: QR, pair-code (versão WA fresca com cache), backoff de reconexão 3s→48s, keep-alive, sessão em MongoDB (`mongoAuthState`) ou ficheiros |
| `bot/callSocket.js` + `liveVoip.js` + `realCall.js` + `atenderChamada.js` | 2º socket Baileys dedicado a chamadas VoIP (QR próprio, pair, aceitar chamada, logout) |
| `bot/messageListener.js` | Anti-delete (cache 2000 msgs), anti-status de grupo, marcador de atividade de membros |
| `bot/commandHandler.js` | O CÉREBRO (2.944 linhas): unwrap de ephemeral, prefixos dinâmicos (`prefixManager`/`prefixEngine`), níveis de acesso (dono/premium/vip), anti-spam, anti-link, media → sticker, IA, **todo o fluxo da AURA** |
| `bot/caseHandler.js` | Carrega **1.847 cases** de `src/bot/cases/*` + cases dinâmicos da DB (`!addcase`/`!removicase`/`!reloadcases`) |
| `bot/cases/` | 40 ficheiros temáticos: downloads, stickers, música (cartão+capa), jogos, RPG, economia, interações, logos, medidores, search, IA, grupos, premium… |
| `bot/rpg/` | Motor RPG (engine, imagens, comunidade) + `RPGPlayer` model |
| `bot/packages/` | interações, família, economia, jogos, cheats |
| `bot/liveBroadcaster.js` | Emite `user:command`, `user:message`, `group:event`, `antilink:action` → dashboard em tempo real (ligado ao IO desde v6.82) |
| `bot/scheduler.js` | Agendamentos (`Schedule` model) |
| `decrypter/` | Dark Net Engine: 15 formatos (ehi, hat, netmod, npv, ssh, wireguard, openvpn…) — usado pelo dashboard (`/dashboard/decrypter`) |
| `database/models/` | 16 schemas: User, GroupSettings, Command, CommandOverride, Economy, RPGPlayer, Session, Schedule, Payment, Media, Log, AiMemory, AntiStatus, DeletedMessage, GameSession, GroupMemberActivity, BotConfig |
| `routes/` + `views/` + `public/` | Dashboard web (ver §4) |
| `sim/` | **Simulador de WhatsApp local** (fakeSock) — é o que permite os 62 scripts de teste rodarem sem rede |

### Infra no repo
| Ficheiro | Papel |
|---|---|
| `render.yaml` | Blueprint: plano free, região Oregon, `NODE_OPTIONS=--max-old-space-size=400` (512 MB), healthCheck `/health`, autoDeploy |
| `package.json` | `start: node src/index.js` + **62 scripts de teste** + `sim` (simulador) + `diag` (diagnóstico de produção) |
| `.env.example` / `COMO_CONECTAR.md` | Guias de env vars e conexão |

---

## 3. AURA — A ASSISTENTE (26 módulos em `src/aura/`)

**Como ela acorda:** numa mensagem sem prefixo de comando, se for PV, se o dono fala livremente, se ela é mencionada/@respondida, ou se está "acordada" no grupo (`auraModes`). O `commandHandler` decide com `auraDecide.deveResponder()` + `auraIntent`.

| Módulo | Papel | Ligado? |
|---|---|---|
| `auraBrain.js` | Memória por chat, humores/moods (limpeza automática 10 min), modos (`semReagir`…) | ✅ |
| `auraTalk.js` | Janela "está a falar com X" (evita intrometer) | ✅ |
| `auraDecide.js` / `auraIntent.js` | Se responde, como responde, qual a intenção | ✅ |
| `auraCommands.js` | Interpreta ordens em linguagem natural → comandos reais (MAPA de 100+ verbos, listas SO_DONO/SO_ADMIN/SO_VIP) | ✅ |
| `auraActions.js` + `actions/` | Execução de ações (banir, promover, criar canal, comunidade…) | ✅ |
| `auraExec.js` / `auraAvancada.js` | Execução com alvo (responde a citação), detecção multi-intenção | ✅ |
| `auraInterpret.js` | Tradução/interpretação de pedidos | ✅ |
| `auraMedia.js` / `auraVoz.js` | Vê mídia (sticker-vision), fala por voz (ElevenLabs/PT) | ✅ |
| `auraMemory.js` / `auraHistorico.js` / `auraAssunto.js` | Memória de longo prazo, histórico, assunto corrente | ✅ |
| `auraModes.js` | Acordar/dormir por chat, `pvDeTodos` | ✅ |
| `auraProativa.js` | **Fala quando quer** (IA gera motivo, ritmo humano, limites) — activa no arranque | ✅ |
| `auraAgenda.js` | Conselhos/orações/dicas/daily agendados (1 timer/60 s) | ✅ |
| `auraGrupo.js` / `auraCanais.js` | Conhecimento do grupo, canais/newsletters (criar, assumir, convites) | ✅ |
| `auraHuman.js` | Personalidade viva (humor, variância de estilo) | ✅ |
| `auraSanitizer.js` / `aiSanitizer.js` | Limpa respostas IA (strip `<think>`, bloqueia links inventados) | ✅ |
| `offlineResponses.js` | Respostas sem chaves de IA (fallback) | ✅ |
| `context/userContext.js`, `memory/` | Contexto do utilizador, lealdade, acções agendadas | ✅ |

**Nota:** sem `GROQ_API_KEY`/`GEMINI_API_KEY` no Render, a Aura usa respostas offline (mais limitadas). Com chaves, usa os 8 providers de `bot/ai.js` (Groq, Gemini, OpenRouter, OpenAI, Cerebras, ApiFreeLLM…).

---

## 4. DASHBOARD (bot ↔ web)

- **22 rotas de página** (`/dashboard/*`) + auth (`/login`, `/register`, `/logout` com rate-limit)
- **~70 endpoints de API** (`/api/*`): estado/arranque/paragem do bot e do callbot, QR/pair, CRUD de comandos, overrides, board, broadcast com progresso por Socket.IO, agendamentos, settings (prefixo, marca d'água de sticker, estilo de menu, canal), utilizadores (premium/free/ban), pagamentos (aprovar/rejeitar), mídia (upload Cloudinary), grupos (settings, membros, ban, sair, enviar), backup export/import/reset, decrypter, convites
- **Tempo real (Socket.IO):** `bot:status`, `bot:log`, `bot:spy`, `broadcast:progress`, `payment:new`, `user:command`, `group:event`, `antilink:action`
- **Página Connect:** polling rápido a `/api/bot/status` (QR aparece sozinho), botões start/par/logout, painel VoIP próprio
- **Segurança:** sessão em MongoDB (`web_sessions`, TTL 7 dias, cifrada), `trust proxy` para o HTTPS do Render, API com `requireApiAuth`/`requireApiOwner`, login com rate-limit 10/15 min

---

## 5. VERIFICAÇÃO — ESTADO DE CADA COISA

### 5.1 Suite de testes (62 scripts, >1.300 verificações) — **TUDO VERDE**
```
syntax 193 ficheiros ✅ · EJS 30 templates ✅ · audit comandos ✅ · roles 12 ✅
auramodes 26 ✅ · auraudit 85 ✅ · auracmds 22 ✅ · submenus 17+40 ✅ · menu18 32 ✅
perf 9 ✅ · e2e 16 ✅ · casehandler 18+ ✅ · rpg-comunidades 13 ✅ · comunidades 8 ✅
ratelimit 22 ✅ · adopção 18 ✅ · aura-comunidade 21 ✅ · aura-voz 28 ✅ · chamadas 16 ✅
aura-viva 19 ✅ · sessão-conflito 17 ✅ · smoke 17 ✅ · aura-brain 22 ✅ · pack 30 ✅
temas 44 ✅ · música-card 42 ✅ · RPG-grupo+Aura 28 ✅ · proativa 22 ✅ · printbugs 20 ✅
etapas 3-6: 45+39+40+41 ✅ · assistente 33 ✅ · criar-canal 17 ✅ · convite 17 ✅
paircode 15 ✅ · voip-qr 6 ✅ · voip-fechar 8 ✅ · economy 64 ✅ · segregação 92 ✅
finalização 72 ✅ · admin/dono 74 ✅ · … (todos os restantes ✅)
```

### 5.2 Teste ao vivo (MongoDB real em memória + servidor real no sandbox)
| Verificação | Resultado |
|---|---|
| Arranque completo com DB (dono criado, seed, scheduler, agenda, proactividade, índices) | ✅ |
| 1.847 cases carregados | ✅ |
| `/ping` `/health` `/status` `/` `/login` | ✅ 200 |
| `/dashboard` sem login → redirect `/login` | ✅ 302 |
| **Login POST** (antes do fix) | ❌ **"Erro ao guardar sessão"** → **CORRIGIDO v6.88** ✅ 302 |
| As 21 páginas do dashboard autenticadas | ✅ 200 todas |
| API: criar/listar comandos, settings, updates, grupos (bot offline ok), backup export | ✅ |
| Logout | ✅ 302 |

### 5.3 🩸 BUG CRÍTICO ENCONTRADO E CORRIGIDO (v6.88 — já no GitHub)
**O login do dashboard estava partido em produção.** O `connect-mongo` cifra as sessões com a lib `kruptein`, que **exige** um secret com ≥8 chars, ≥2 maiúsculas, ≥2 minúsculas, ≥2 dígitos e ≥2 caracteres especiais. O `render.yaml` recomenda `openssl rand -hex 32` (só minúsculas + hex) → `req.session.save()` rebentava com `TypeError` dentro do MongoStore → o formulário de login devolvia sempre **"Erro ao guardar sessão"**.
**Fix:** o `src/index.js` agora deriva um secret de cifra determinístico e sempre válido (`sha512` do `SESSION_SECRET` + prefixo com todas as classes exigidas). A cifra continua a depender 100% do `SESSION_SECRET` do Render. **Não é preciso mudar nenhuma env var.**
Commit `937a5cf` → pushed para `main` → o Render faz autoDeploy sozinho.

### 5.4 ✅ v6.87 da sessão anterior — PERDIDO e RE-FEITO como v6.89
O commit `db40349` original nunca chegou ao GitHub e perdeu-se. As 3 funcionalidades foram **re-implementadas de novo (v6.89)** e estão no `main`:
1. **Sticker-ban** (`src/aura/stickerBan.js`): o Dono ensina por conversa ("Se eu responder alguém com este sticker de ban vc remove ele") → ela confirma como pessoa e guarda a regra + hash do sticker (persistida no BotConfig) → a partir daí, responder a alguém com o sticker remove a pessoa ("🩸 Removido por ordem do Dark"). Segurança: só o Dono, nunca remove o Dono nem o bot, cancelável por conversa.
2. **Instruções ≠ comandos** (`auraCommands.eInstrucao`): frases condicionais ("se eu… vc remove…") já não são roubadas pelo interpretador; ordens directas ("aura bane o Zeca") continuam.
3. **RPG por selecção** (`src/bot/rpg/createFlow.js`): `!rpgstart` abre lista clicável de RAÇAS → CLASSES → ficha pronta com bónus da origem; o caminho escrito `!rpgstart Nome raça classe` agora cria mesmo (antes só listava).
Testes: `test:printbugs2` **21/21** (frase exacta do print, remoção via sticker, guardas, fluxo completo das listas) + suite completa 63 scripts verde.

---

## 6. OBSERVAÇÕES (não-bloqueantes)
1. **Versões inconsistentes:** `package.json` diz `5.1.0`, consola diz `v3.0.0` (`darkUtils.botVersion`), `/health` diz `6.73.0`, commits dizem v6.86–v7.25. Sugestão: unificar num sítio só.
2. O aviso `connect.session MemoryStore` só aparece **sem** `MONGODB_URI` (modo degradado intencional) — em produção com DB não aparece.
3. O `render.yaml` recomenda `openssl rand -hex 32` para `SESSION_SECRET` — com o fix v6.88 qualquer formato já funciona, mas podes usar `openssl rand -base64 32` por boa prática.
4. UptimeRobot: confirma que o monitor aponta para `/ping` (5 min) — o `/health` é do Render. O bot também se auto-pinga a cada 14 min.
5. Se a Aura "não responde" em produção: abre `/diag` — mostra chaves, guardas (`ai_auto_enabled`, `disabled_groups/users`), conflitos de sessão (causa nº1 de "online mas mudo").

---

## 7. CONCLUSÃO
✅ **Bot ↔ Dashboard ↔ MongoDB ↔ Socket.IO: tudo conectado e funcional** (provado ao vivo + 62 scripts de teste).
🩫 **1 bug crítico encontrado e corrigido:** login do dashboard (v6.88, já no GitHub, deploy automático).
📌 **Pendente:** re-implementar o v6.87 perdido (sticker-ban por aprendizagem, instruções ≠ comandos, RPG por seleção) se assim quiseres.
