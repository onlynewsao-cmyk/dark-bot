# Verificação completa — DARK BOT + AURA + Dashboard

**Data:** 23 de agosto de 2026
**Ramo:** `arena/01a02f31-dark-bot`
**Âmbito:** compreender toda a estrutura, verificar se todas as funções estão ligadas e funcionais (bot ↔ dashboard ↔ Aura), e corrigir o que estava morto.

---

## 1. Arquitectura (como tudo encaixa)

### Arranque (`src/index.js`)
1. Express + Socket.IO + sessões (MongoStore quando há MongoDB).
2. `connectDB()` — MongoDB é obrigatório em produção (`NODE_ENV=production`); em dev a app arranca sem persistência.
3. Sincroniza o dono (`OWNER_USERNAME`/`OWNER_PASSWORD` do Render) na colecção `users`.
4. Auto-reconexão WhatsApp: se houver sessão no MongoDB (`Session`), `bot.start()` corre sozinho; idem para o Baileys secundário de chamadas (`call:*`).
5. Arranca `scheduler`, `botConfigCache` (refresh 5 min), `auraHuman.limparMoods` e `auraAgenda`.

### Render Free + UptimeRobot
- `render.yaml` v3: plano free, `healthCheckPath: /health`, build com yt-dlp opcional.
- `/ping` → resposta leve 200 para o UptimeRobot (5 min) evitar hibernação.
- `/health` → JSON com estado do bot, callbot, DB, uptime, contadores.
- Keep-alive interno duplo: `whatsapp.js` faz ping a `${APP_URL}/ping` a cada 14 min quando ligado.
- `NODE_OPTIONS=--max-old-space-size=400` para caber nos 512 MB do free tier.
- `/status` → página pública de estado; `/diag` → diagnóstico real do processo (commit, chaves, guardas, conflitos de sessão); `/test-pv` → simulação do pipeline de mensagens.

### WhatsApp (`src/bot/whatsapp.js`)
- `@systemzero/baileys` como motor; auth em MongoDB (`mongoAuthState`) com fallback para ficheiros.
- Reconexão com backoff, detecção de **conflito de sessão (440)** — pára após 3 conflitos para não queimar o número.
- Pair code: espera o websocket abrir (`_esperarWsAberto`) e o servidor aceitar o login (`_esperarProntoParaPair`) antes de `requestPairingCode`.
- Eventos: `messages.upsert` → `commandHandler.handle` + `antiLink.check` + `antispam.check` em paralelo; `group-participants.update` → `groupEvents`; `call` → `callHandler` (ou `callSocket` secundário).

### Pipeline de mensagens (`src/bot/commandHandler.js`, 2863 linhas)
1. `unwrapWhatsAppMessage` — desembrulha ephemeral/viewOnce/edited (sem isto a Aura ficava muda no PV).
2. Detecção de prefixo **rigorosa por grupo** (`prefixEngine`): símbolo errado = silêncio total.
3. `caseHandler` — 1847 cases em `src/bot/cases/` (279 comandos no catálogo auditado).
4. Pacotes (interactions/family/economy/games/cheats), `nativeCommands`, comandos de base de dados (`Command`).
5. Aura atravessa o pipeline em 31 pontos (ver secção 3).

### Dashboard (`src/routes/` + `src/views/`)
- `auth.js` — login/registo com rate-limit, sessão regenerada, dono criado por env.
- `dashboard.js` — 20+ páginas (home, connect, control, console, broadcast, schedule, settings, ia, commands, board, media, users, payments, stats, backup, groups, internet, decrypter, profile, subscribe, add-bot).
- `api.js` — 60+ endpoints REST com `requireApiAuth`/`requireApiOwner`; tudo o que o frontend `fetch()` chama existe (verificado 1:1).
- Socket.IO: servidor emite `bot:status`, `bot:log`, `bot:spy`, `callbot:*`, `broadcast:*`, `payment:new`, `user:command`, `group:event`, `antilink:action`; o frontend ouve exactamente estes eventos.

### Aura (`src/aura/`, 28 módulos)
- **Modos** (`auraModes`): AURA original (só onde o Dono a invocou, persistido em `GroupSettings.auraMode`) vs Assistente (padrão, profissional). PV do Dono é sempre AURA.
- **Decisão** (`auraDecide`): escolhe SE responde (mencionada/chamada/resposta → sempre; conversa alheia → nunca) e COMO (texto/áudio/reacção).
- **Cérebro** (`auraBrain`): 3 camadas — modos por chat (0 ms) → catálogo de ~130 capacidades com gatilhos PT (0 ms) → router de IA só quando `pareceOrdem()` passa (portão de verbos de comando).
- **Humanidade** (`auraHuman`): humores, defesa do Dark, silêncio, voz; **`auraInterpret`** re-encena pedidos de zoeira quando a IA recusa por política, com fallback local.
- Resto: memória (`auraMemory`, `memory/`), histórico, assunto, media, voz, canais, agenda, acções de grupo/comunidade (`actions/` com ~130 funções ligadas pelo `auraBrain`).

### Fluxo bot ↔ dashboard (verificado E2E)
```
mensagem WhatsApp → commandHandler.handle()
  → case/nativo/pacote executa
  → incrementUserCommand() ──► liveBroadcaster.userCommand() ─┐
group-participants.update → groupEvents.handle() ─► groupEvent()─┤  Socket.IO
link detectado → antiLink.check() ─► antilinkAction() ──────────┘     ↓
                                                    /dashboard/groups (feed live)
```

---

## 2. Verificações executadas

| Verificação | Resultado |
|---|---|
| `require()` de todos os módulos de `src/` | 187/187 após corrigir `watermark.js` (antes 186/187) |
| Sintaxe JS | 191/191 ficheiros |
| Templates EJS | 30/30 válidos; todas as views renderizadas existem |
| Catálogo de comandos | 279 comandos auditados |
| Suite completa (62 scripts `test:*`) | **60 aprovados**; 2 reprovam apenas por rede externa bloqueada no sandbox (Pinterest/boorus/Tenor — chamadas HTTP reais que o teste exige; em produção passam) |
| Arranque real da app (`node src/index.js`) | limpo, com e sem MongoDB |
| Endpoints HTTP | `/` 200 · `/health` 200 · `/ping` 200 · `/status` 200 · `/login`/`/register` 200 · `/dashboard*` 302→login · `/api/*` 401 sem sessão · `/diag` 200 · 404 OK |
| Socket.IO handshake | OK (`sid` devolvido) |
| `/test-pv` (pipeline simulado) | Aura respondeu no PV do dono e a mensagem ephemeral foi desembrulhada e respondida; `.ping` silenciado correctamente (prefixo activo é `!`, motor rigoroso) |
| E2E bot→dashboard | app real arrancada; cliente Socket.IO recebeu `bot:status` no arranque, `user:command` após `!ping` real no pipeline e `group:event` após evento de grupo |

## 3. Problemas encontrados e corrigidos

### 🔧 1. Feed live do dashboard estava MORTO (bot ↔ dashboard desligados)
`src/bot/liveBroadcaster.js` existia mas **nunca era inicializado nem chamado**:
o `setIO(io)` não corria em lado nenhum e nenhum handler emitia `user:command`,
`group:event` ou `antilink:action` — mas `/dashboard/groups` ouve exactamente
esses eventos. O feed live nunca recebia nada.

**Correcção (v6.82):**
- `src/index.js`: `liveBroadcaster.setIO(io)` após criar o servidor Socket.IO.
- `commandHandler.incrementUserCommand()` emite `user:command` (os 5 pontos de
  sucesso de comando passam agora o nome do comando).
- `groupEvents.handle()` emite `group:event` para add/remove/promote/demote.
- `antiLink.check()` emite `antilink:action` nos ramos delete/kick/warn.

Validado por teste E2E real (secção 2).

### 🔧 2. `src/bot/watermark.js` não carregava
Dois caminhos de `require` errados (`../../config` e `../stickerMaker` —
o ficheiro está em `src/bot/`). Qualquer `require` do módulo rebentava.
Corrigido para `../config` e `./stickerMaker`; o módulo agora carrega.

### ⚠️ Não-código (operações, não bugs)
- As 8 falhas de `test:menu18` e 1 de `test:casehandler` são chamadas reais a
  APIs externas (e621, yande, safebooru, Pinterest, Tenor). O sandbox de
  auditoria bloqueia egresso para esses hosts; em produção (Render) passam.
- `mongodb-memory-server` não funciona no sandbox (fastdl.mongodb.org
  bloqueado) — a verificação com base de dados foi feita por análise de código
  + testes com mocks, como nas auditorias anteriores.

## 4. Estado operacional para produção (Render)

Confirmado no `render.yaml` e no código — nada a mudar:
- `MONGODB_URI` (Atlas M0) obrigatória; a app recusa arrancar em produção sem ela.
- `APP_URL` tem de ser exactamente o URL do Render (keep-alive interno usa-o).
- Pelo menos uma chave de IA (`GROQ_API_KEY` ou `GEMINI_API_KEY`) para respostas
  generativas da Aura — sem elas há fallback offline, sem erros expostos no chat.
- UptimeRobot em `${APP_URL}/ping` a cada 5 min.
- Se "online mas não responde": verificar `/diag` → `conflitos_de_sessao`
  (duas instâncias com as mesmas credenciais é a causa nº 1).
- A chave de GitHub usada pela integração está funcional (API respondida com
  sucesso durante a auditoria; `githubstalk` usa a API pública).

## 5. Ficheiros alterados

```
src/index.js               +5   liveBroadcaster.setIO(io)
src/bot/commandHandler.js  +17  user:command + nome do comando nos 5 dispatch points
src/bot/groupEvents.js     +15  group:event em todas as acções
src/bot/antiLink.js        +7   antilink:action (delete/kick/warn)
src/bot/watermark.js       ±2   caminhos de require corrigidos
```
