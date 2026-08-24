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

### 5.1 Suite de testes (63 scripts, >1.300 verificações) — **TUDO VERDE**
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
> ⚠️ **Nota de ambiente (v6.87):** os números acima são do teste ao vivo com MongoDB real.
> Corridos num *sandbox* sem rede e sem MongoDB, **63/67 execuções passam**; as excepções são
> ambientais, não de código: `test:menu18` (8 verificações que descarregam imagens de fontes
> externas) e `test:casehandler` (1 verificação que chama o Pinterest) falham com
> `Client network socket disconnected`, e `test:comunidades` / `test:ratelimit` / `test:adopcao`
> ficam à espera de um MongoDB que não existe no sandbox. O `npm test` está encadeado com `&&`,
> por isso pára no primeiro destes — para auditar tudo de uma vez, correr script a script.

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

### 5.4 ✅ v6.87 — PERDIDO e re-feito **duas vezes** (v6.89 no `main` + v6.90 nesta rama)
O commit `db40349` original nunca chegou ao GitHub (o push foi bloqueado quando o PR #1 fez merge) e perdeu-se. Confirmado de três maneiras: `gh api .../commits/db40349` devolve `422 No commit found`, `git fsck --lost-found` não tem objectos pendurados, e a ponta de `arena/01a02f31-dark-bot` é `0bc14e1` = **v6.86** (PR #1 merged). As 3 funcionalidades foram re-implementadas **em paralelo, por duas sessões diferentes** — o que ficou no `main` como **v6.89** e o que está nesta rama como **v6.90**. Não são duplicados: são camadas diferentes, e ficam as duas.

**O que veio no `main` (v6.89):**

| Funcionalidade | Onde | O que faz |
|---|---|---|
| Sticker-ban do Dono | `src/aura/stickerBan.js` | O Dono ensina por conversa ("Se eu responder alguém com este sticker de ban vc remove ele") → ela guarda a regra + hash no `BotConfig` → a partir daí, **responder a alguém com o sticker remove a pessoa** ("🩸 Removido por ordem do Dark"). Só o Dono ensina e dispara; nunca remove o Dono nem o bot; cancelável por conversa. |
| Instrução ≠ comando | `auraCommands.eInstrucao` | Frases condicionais ("se eu… vc remove…") deixam de ser roubadas pelo interpretador. |
| RPG por selecção | `src/bot/rpg/createFlow.js` | `!rpgstart` abre lista clicável RAÇAS → CLASSES → ficha, com cliques `RPGPICK_R_*`/`RPGPICK_C_*` interceptados no `commandHandler` (mesmo mecanismo do `CHANGE_THEME_`). |

**O que esta rama acrescenta (v6.90):**

| Funcionalidade | Onde | O que faz |
|---|---|---|
| **Anti-figurinha por grupo** | `src/bot/antiSticker.js`, `src/bot/cases/stickerBan.js`, modelo `BannedSticker`, gancho em `messageListener.js` | Complemento do sticker-ban do Dono: qualquer **admin** responde a uma figurinha com `!bansticker` e o grupo aprende-a — de cada vez que alguém a mandar, é apagada. Identidade = `fileSha256` da metadata, **sem downloads**. `!antisticker on/off/status/notify` · `!unbansticker` · `!banstickers`. |
| **Guarda de instruções alargada** | `src/aura/auraInstructionGuard.js` | A `eInstrucao` do v6.89 apanha condicionais. Esta cobre o resto: pergunta · negação · relato no passado · sujeito na 3ª pessoa · determinante (→ substantivo) · citação · referência ao próprio comando · verbo tarde de mais. Sem ela, `"o ban foi injusto"` corria `.ban`, `"ele marca golos"` corria `.tagall`, `"não bana o rapaz"` corria `.ban`. Só se aplica a comandos que mexem em terceiros — `"qual é o meu saldo?"` continua a responder. |
| **Persistência de raça/classe** | campos `race`/`class`/`raceBonusApplied` no `RPGPlayer` | 🩸 **Bug crítico do v6.89 corrigido:** ver §5.5. |

### 5.5 🩸 BUG CRÍTICO DO v6.89 — o RPG por selecção **não gravava nada**
O `createFlow._finalizar()` faz `p.race = race; p.class = cls`, mas **os campos `race` e `class` não existem no schema do `RPGPlayer`**. Com o `strict: true` do Mongoose (o default), a atribuição é aceite em memória e **ignorada em silêncio na gravação**. Prova, corrida contra o `main`:

```
schema tem race?  false      em memória   : race=shinobi class=pirata
schema tem class? false      no documento : race=undefined class=undefined
```

Ou seja: a ficha de confirmação mostrava a raça certa (lê da memória), mas o `.rg`, o combate e tudo o que voltasse a carregar o jogador do Mongo viam sempre o fallback **"humano guerreiro"**. Nenhum jogador na história do bot teve raça guardada — nem antes do v6.89, nem depois.

**Fix (v6.90):** `race`, `class` e `raceBonusApplied` no schema + o bónus da origem passa a aplicar-se **uma única vez** (o `_finalizar` somava o bónus a cada `!rpgstart`, a inflar stats sem limite).

### 5.6 🩸 AUDITORIA REAL DO RPG (v6.90) — 7 grupos de comandos estavam mortos
O `test:rpgcom` só verifica se cada comando "devolve texto", por isso um comando que responde sempre a mesma mensagem de erro passa como verde. Foi criada uma auditoria que **corre** os comandos (`scripts/test-rpg-audit.js`, `npm run test:rpgaudit`) com um jogador realista e exige que façam o que dizem. Resultado da primeira passagem: **41 de 151 comandos rebentavam**.

**a) 11 `if` sem chavetas no `cases/rpg2.js`.** Uma ferramenta qualquer tinha removido as chavetas e deixado o `return` solto:

```js
if (p.hp <= 0) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '💀 MORTO', [...]);   // ← corria SEMPRE
```

O `return` não pertencia ao `if` — corria em todas as chamadas, e tudo o que vinha a seguir era código morto. Comandos afectados: `.quest`/`.historia`/`.aventura` (respondiam sempre "⏳ COOLDOWN", com 0s), `.lutar`/`.fight`/`.combate` (sempre "💀 Estás morto"), `.explorar`/`.explore`, `.pocao`/`.potion` (sempre "❌ Sem poções"), `.reviver`, `.guilda criar` e `.nome`. **Todos corrigidos.**

**b) `Cannot access 'p' before initialization`.** Em `.quest`, `.explorar` e `.nome` o `await rpg.savePlayer(p)` estava **antes** do `const p` — com o cooldown activo rebentava por temporal dead zone. O `p` foi movido para cima e o `savePlayer` espúrio (não havia nada gravado) removido.

**c) O sistema de quests falava uma língua e o motor outra.** O case lia `q.title`, `q.chapter`, `q.story`, `q.choices[].text` e `choice.reward`; o engine tem `titulo`, `texto`, `escolhas[].txt`, `.next` e `.xp`. E começava no id `'prologo'`, que não existe (o primeiro é `'inicio'`) — ou seja, ficava em loop a "criar" a mesma quest. Reescrito contra os campos reais.

**d) `rpg.ITEMS` nunca existiu.** `.eat`, `.vender` e `.loja`/`.shop`/`.mercador` liam um catálogo que não estava no motor (só havia `SHOP`, keyed por id curto e sem relação com os nomes que vão para o inventário). `.eat` rebentava com `Cannot read properties of undefined (reading 'peixe')` e `.loja` com `Cannot convert undefined or null to object`. Criado o catálogo com 31 itens, **keyed exactamente pelos nomes que os biomas e as quests põem no inventário** — sem isto o jogador apanhava loot que nunca conseguia vender.

**e) NPCs sem falas.** `.npc`/`.falar`/`.talk` faziam `P(npc.dialogues)` sobre um campo que não existia (`fala` era uma string única) → `Cannot read properties of undefined (reading 'length')`. Cada NPC tem agora 3 falas.

**f) `P(NPCS)` sobre um objecto.** `.explorar` fazia `P(NPCS).name` — `NPCS` é um objecto, `P()` devolvia `undefined` e o comando rebentava **ao construir a lista de eventos**, ou seja, sempre.

### 5.7 🌍 MUNDO DO RPG (v6.90)
O `!world` era uma lista estática de biomas — igual para quem acabou de começar e para quem já tinha atravessado o abismo. Não havia mundo, havia um menu. Agora (`src/bot/rpg/world.js` + `cases/rpgWorld.js` + campo `world` no `RPGPlayer`):

| Comando | O que faz |
|---|---|
| `!world` / `!mapa` / `!biomas` | Mapa com **estado**: o que já viste (✅), o que está aberto (🔓) e o que ainda pede nível (🔒), barra de progresso, perigo e loot de cada sítio |
| `!viajar <sítio>` | Desloca o jogador; a **1ª visita dá XP** e há encontro real (loot/inimigo/NPC) com os helpers do engine, não texto morto |
| `!mundial` / `!rankmundial` | Ranking mundial de todos os jogadores por nível e reputação (degrada com honestidade sem MongoDB) |

Os `nivel`/`danger` dos biomas já existiam no engine — ninguém os usava.

**Depois das correcções: 151/151 comandos do RPG correm sem erro e `npm run test:rpgaudit` = 25/25.**

---

## 6. OBSERVAÇÕES (não-bloqueantes)
1. **Versões inconsistentes:** `package.json` diz `5.1.0`, consola diz `v3.0.0` (`darkUtils.botVersion`), `/health` diz `6.73.0`, commits dizem v6.86–v7.25. Sugestão: unificar num sítio só.
2. O aviso `connect.session MemoryStore` só aparece **sem** `MONGODB_URI` (modo degradado intencional) — em produção com DB não aparece.
3. O `render.yaml` recomenda `openssl rand -hex 32` para `SESSION_SECRET` — com o fix v6.88 qualquer formato já funciona, mas podes usar `openssl rand -base64 32` por boa prática.
4. UptimeRobot: confirma que o monitor aponta para `/ping` (5 min) — o `/health` é do Render. O bot também se auto-pinga a cada 14 min.
5. Se a Aura "não responde" em produção: abre `/diag` — mostra chaves, guardas (`ai_auto_enabled`, `disabled_groups/users`), conflitos de sessão (causa nº1 de "online mas mudo").

---


## 7. v6.90 — MOTOR DE REGRAS GENÉRICO (ela aprende o que tu quiseres)
Para além dos factos que ela já memorizava, agora **ensinas regras com gatilho → acção por conversa** (`src/aura/rulesEngine.js`):
- **Ensinar** (só o Dono): *"quando eu disser pizza vc responde UHUL PIZZA"* / *"se alguém mandar link avisa a pessoa"* / *"quando alguém disser bom dia reage com ☀️"* / *"quando eu mandar a palavra código envia o link do grupo"* → confirma sempre o que entendeu ("Tá. Quando TU disseres …")
- **Gatilhos**: palavra/frase (com aspas ou não) · link · sticker (cita o sticker no ensino)
- **Acções**: responder texto · reagir com emoji · remover do grupo · avisar com menção · enviar link do grupo · apagar mensagem
- **Âmbito**: ensinada num grupo → vale nesse grupo; ensinada no PV → vale em todo o lado
- **Gerir**: *"que regras te ensinei?"* (lista numerada) · *"cancela a regra do pizza"* / *"cancela a regra 2"* · *"esquece todas as regras"*
- **Segurança**: só o Dono ensina/cancela · "remover" nunca atinge o Dono nem o bot · máx. 20 regras · cooldown 15 s por regra+chat (anti-spam) · comandos com prefixo nunca disparam regras · persistido em BotConfig (sobrevive a restarts)
- Testes: `test:rules` **25/25** (ensino, execução, guardas, gestão, limite, fim-a-fim pelo handler sem a IA duplicar)

## 8. v6.90b — RPG com MUNDO + correções de fundo (outra sessão, PR #2)
- `race`/`class` passaram a existir no schema do `RPGPlayer` (antes a raça nunca era guardada!) e o `!rpgstart` deixou de ignorar os próprios argumentos
- 7 grupos de comandos RPG mortos reparados + `world.js` (mundo com estado) + case `rpgWorld` + submenu novo
- Anti-sticker por grupo (`antiSticker.js` + modelo `BannedSticker` + `.stickerban`): apaga stickers banidos — complementar ao sticker-ban por conversa (v6.89)
- Guarda de instruções reforçada (`auraInstructionGuard.js`): "o ban foi injusto" / "somos todos irmãos" já não disparam comandos
- Testes novos: `test:printbugs3` + `test:rpgaudit`

## 9. CONCLUSÃO
✅ **Bot ↔ Dashboard ↔ MongoDB ↔ Socket.IO: tudo conectado e funcional** (provado ao vivo + 66 scripts de teste).
🩫 **1 bug crítico encontrado e corrigido:** login do dashboard (v6.88, já no GitHub, deploy automático).
✅ **v6.87 re-implementado** (sticker-ban por aprendizagem, instruções ≠ comandos, RPG por selecção) — `npm run test:printbugs2` = **14/14**.
🩫 **2 bugs de fundo encontrados ao re-implementar o v6.87:** `race`/`class` não existiam no schema do `RPGPlayer` (a raça nunca foi guardada) e o `!rpgstart` ignorava os próprios argumentos (o nome ficava "Kira elfo mago").
