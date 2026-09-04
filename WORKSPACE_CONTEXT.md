# DARK BOT — Contexto de trabalho local

Atualizado em 2026-09-04 após sincronização de `main`.

## Estado sincronizado

- Repositório: `https://github.com/onlynewsao-cmyk/dark-bot`
- Pasta local: `/home/user/dark-bot`
- Branch: `main`
- Commit atual: `3cbaea75f0bb09edc7c7b14418d8d837f8de47b3` (`3cbaea7 fix: reconhecer admins com ids lid e pn`)
- Working tree limpo no momento da sincronização.
- 376 ficheiros versionados (~93 mil linhas: `src/bot` 43k, `scripts` 12k, `src/aura` 9.7k, `src/views` 4.3k, `src/decrypter` 3.2k).
- Não foram copiados `.env`, sessões, credenciais ou chaves de runtime.

### Últimos commits desde a sincronização anterior (f4a291b)

| Commit | O que muda |
|---|---|
| `3cbaea7` | Admin do grupo reconhecido por `id`, `jid`, `lid`, `pn` (WhatsApp mistura LID e número). |
| `01cf75e` | AURA volta a responder a mensagens consecutivas no PV (cooldown global removido, dedup por `chat+messageId`). |
| `d69ed1e` / `9a92bdb` | Chamada iniciada pela AURA vai para o PN do Dono, não para o LID. |
| `7afa74c` | Pair code destravado (aguarda WS aberto antes de `requestPairingCode`). |
| `3a67da0` | `AUTO_CALL=off` por defeito — chamadas automáticas desligadas. |
| `c462d01` | Botões do card `play` na mesma linha. |
| `ec07f15` | README com identidade visual completa. |
| `d77e1ba` | Normalização do JID alternativo no PV (`remoteJidAlt`/`remoteJidPn`). |
| `2d2c717` | `mediaQuality.js` — perfis baixa/média/alta para áudio/vídeo. |

---

## 1. Arranque e infraestrutura

| Ficheiro | Função |
|---|---|
| `src/index.js` (568 l) | Bootstrap: Express + EJS + `express-session` (MongoStore) + Socket.IO. Regista `liveBroadcaster.setIO(io)`. Rotas: `/` (auth), `/dashboard`, `/api`. Health: `/health` (Render), `/ping` (UptimeRobot), `/status`, `/diag` (diagnóstico com últimas 20 msgs mascaradas, estado de chamadas, auto-call), `/test-pv`. Auto-start do bot se existir `Session` guardada. Timers: refresh do `botConfigCache` a cada 5 min, `auraHuman.limparMoods`, `auraAgenda.arrancar`, `auraProativa.arrancar`, `scheduler`. Handlers `unhandledRejection`/`uncaughtException` que **não** matam o processo (v6.91). |
| `src/config.js` (87 l) | Normaliza env: `port`, `isProd`/`isProduction`, `sessionSecret`, `appUrl`, `channelUrl`, `owner{name,number,username,password}`, `bot{name,number,prefix}`, `mongodb.uri`, `cloudinary`, `ai{groq,gemini,openrouter,openai,cerebras,apifreellm,assemblyai,elevenlabs,tavily,huggingface}`, `tenorApiKey`, `maxYoutubeSeconds`, `stickerVideoMaxSec`. |
| `src/database/connection.js` / `migrate.js` | Ligação Mongoose e migrações. |
| `src/middleware/auth.js` | `requireAuth` / `requireOwner` para o dashboard. |
| `render.yaml` | Blueprint Render Free (porta 10000, `--max-old-space-size=400`, `/health`, yt-dlp opcional). |
| `.env.example` | Variáveis mínimas: servidor, dono, bot, MongoDB, IA (Groq/Gemini), `AUTO_CALL`, Cobalt/YT proxy, Tenor, Cloudinary. |
| `quickstart.js`, `fix-aura.js`, `tmp-load.js`, `mediaQuality.js` | Utilitários de raiz. `mediaQuality.js` é usado por `systemZeroPlay`/`downloads`. |

### Modelos MongoDB (`src/database/models/`, 19)

| Modelo | Campos-chave |
|---|---|
| `User` | username, password (bcrypt), whatsappNumber, role, premiumUntil, pvCommandsToday, vipGroupLimit, aiTone, aiMemoryId |
| `Session` | fileName, content — credenciais Baileys persistidas (via `mongoAuthState.js`) |
| `BotConfig` | key/value genérico (prefixos, owners extra, `dynamic_cases_v2`, temas, watermark…) |
| `GroupSettings` | botEnabled, antilink (modo/ação/warns/stats), antisticker, antispam, welcome/goodbye, onlyAdmins, prefixo, tema, tipo de grupo |
| `GroupMemberActivity` | mensagens/comandos por membro, warnings, inatividade |
| `Command` / `CommandOverride` | comandos criados no dashboard / overrides (enable, accessLevel, resposta custom) sobre comandos nativos |
| `Economy` | coins, bank, xp, level, aura, cooldowns (work/daily/rob/crime…), inventário, casamento |
| `RPGPlayer` | personagem, universo, raça, classe, stats, equipamento, quest, mundo, karma |
| `GameSession` | jogo ativo por grupo (estado, aposta, pote, vencedor) |
| `AiMemory` | histórico + perfil por utilizador para a IA/AURA |
| `BannedSticker` | hash de figurinhas banidas por grupo (sticker-ban da AURA) |
| `AntiStatus`, `DeletedMessage`, `DecryptLog`, `Log`, `Media`, `Payment`, `Schedule` | auxiliares (anti-status, anti-delete, logs do decrypter, mídia Cloudinary, pagamentos premium, agendamentos) |

---

## 2. Ligação WhatsApp

| Ficheiro | Função |
|---|---|
| `src/bot/whatsapp.js` (550 l) | Classe `WhatsAppBot` (singleton via `getBot(io)`). Auth: `useMongoAuthState` (produção) ou `useMultiFileAuthState` (local). Resolve versão WA, `makeWASocket` (`@systemzero/baileys`), backoff de reconexão, keep-alive de 14 min. Eventos: `creds.update`, `connection.update` (QR → Socket.IO, pair code), `messages.upsert` → `commandHandler`, `messages.update` (anti-delete), `group-participants.update` → `groupEvents`, `call` → `callHandler`. |
| `src/bot/mongoAuthState.js` | Persistência das creds/keys Baileys no modelo `Session`. |
| `src/bot/callSocket.js` | **Segundo** socket Baileys isolado só para chamadas (callbot). |
| `src/bot/callHandler.js`, `atenderChamada.js`, `realCall.js`, `callBridge.js`, `autoCall.js`, `liveVoip.js` | Pipeline de chamadas: atender (sequência WACRG), originar chamada real (o telemóvel toca), bridge que tenta todos os métodos, auto-call ao Dono (desligado por defeito), voz RTP experimental. |
| `src/bot/usync.js` | Resolução LID ⇄ número de telefone. |
| `src/bot/liveBroadcaster.js` | Emite `bot:log`, `bot:message`, `user:command` etc. para o dashboard via Socket.IO. |

---

## 3. Pipeline de mensagens (`src/bot/commandHandler.js`, 3077 l)

Ordem real dentro de `_handleInner(sock, msg)`:

1. **Normalização** — `unwrapWhatsAppMessage`, `normalizeIncomingMsg`, `extractText`, `getSenderInfo` (LID/PN, `remoteJidAlt`), ruído ignorável.
2. **Interceptores de UI** — resposta numérica do card de música (`musicaCard`), listas do RPG (`rpg/createFlow`), lista do `change` (temas), botões de plano premium.
3. **PrefixEngine v2** — prefixo por grupo/global, `ctx.prefixSource` (`group` | `global` | `button`).
4. **Dono + blacklist + configs** num único round-trip (`botConfigCache`): número env, número do dashboard, LID, owners extra.
5. **Proteções** — `antiLink` (DarkShield v2), `antiSpam` v3, `antiSticker` (aprendizagem por hash), `stickerBan`, `rulesEngine` (regras aprendidas por conversa).
6. **Regras de aluguel / cargo** — `roleResolver` (Dono, Subdono, VIP, Free, Admin do grupo), aviso de aluguel (v6.94: assistente nunca fica calada).
7. **Mídia sem comando** — AURA multimodal: ver imagem, ler documento, ler link, transcrever áudio, `stickerVision`, decrypt automático de ficheiros (`.ehi`, `.hat`, …).
8. **Sem prefixo → AURA** — `auraDecide` escolhe se responde; `auraBrain.rotearComIA` pode traduzir linguagem natural em comando (`caseHandler.runCase`); senão `auraHuman`/`auraModes` geram a resposta.
9. **Com prefixo → despacho de comando** (ordem de prioridade):
   1. `CommandOverride` do dashboard (pode desativar/restringir);
   2. limite Free no PV (50 cmds/dia);
   3. **`caseHandler.runCase`** — ~1870 cases (prioridade máxima);
   4. `packages/*` (interactions, family, economy, games, cheats);
   5. `nativeCommands`;
   6. `Command` da base de dados (criados no dashboard);
   7. comando desconhecido → sugestão por Levenshtein só se o prefixo real foi usado.
10. Pós-execução — `incrementUserCommand`, contadores do grupo, `reactions` (✅/❌), broadcast para o dashboard.

### Motor de cases (`src/bot/caseHandler.js`, 1227 l)

- `loadCases()` carrega todos os `src/bot/cases/*.js`; cada ficheiro exporta `function(registerCase)` e chama `registerCase(['play','music',…], handler)`.
- Cases dinâmicos guardados em `BotConfig.dynamic_cases_v2` (comandos `addcase` / `delcase` / `listcases`, só Dono). `detectFormat` aceita 4 formatos (switch-case clássico, `module.exports.execute`, função, arrow); `adaptCaseCode` traduz `conn`/`m`/`reply`; `validateCase` bloqueia `eval`, `Function(`, `child_process`, path traversal; `ensureDeps` instala dependências em falta.
- `buildM()` constrói o wrapper `m` clássico para compatibilidade com cases de outros bots.

### Ficheiros de cases (`src/bot/cases/`, 38 ficheiros, 10.8k l)

| Ficheiro | Área |
|---|---|
| `downloads.js`, `downloads2.js`, `musica.js` | play/play2/play3/playhq, ytd/gyt (botões), video/video2, TikTok/IG/FB/Twitter/Spotify via `dl/*`, card DARK TÓXICO |
| `stickers.js`, `stickers2.js`, `stickerly.js`, `pack.js`, `figcategorias.js`, `stickerBan.js` | figurinhas, packs, renomear, watermark, categorias, sticker.ly, ban por hash |
| `ia.js`, `ia2.js`, `auraInvoke.js` | comandos de IA (gpt, imagine, transcrever, tts), invocar/acordar AURA |
| `grupos.js`, `audioAdmin2.js`, `online.js`, `medidores.js` | administração de grupos, anti-*, welcome, marcar todos, medidores/brincadeiras |
| `economia2.js`, `jogos2.js`, `interacoes2.js`, `random.js` | economia extra, jogos, interações, aleatórios |
| `rpg2.js`, `rpgSetup.js`, `rpgWorld.js`, `rpgCommunity.js` | RPG completo (usa `src/bot/rpg/*`) |
| `search2.js`, `texto2.js`, `logos.js`, `info.js` | pesquisas (Pinterest, imagens, wiki), texto fancy, logos, info/menus |
| `premium.js`, `rental2.js`, `finalizar.js`, `perf.js` | planos, aluguel de grupos, finalizar fluxo, performance |
| `change.js`, `dynamicSubmenus.js`, `chamadas.js` | temas do `change`, submenus dinâmicos, comandos de chamadas |
| `extras.js`, `extraCases.js`, `stubs.js` | miscelânea; `stubs.js` gera respostas funcionais para comandos ainda sem implementação real |

### Pacotes nativos (`src/bot/packages/`, 3.8k l)

`interactions.js` (~200 interações com GIFs Tenor), `family.js` (casamento, adoção, divórcio), `economy.js` (trabalho, daily, roubo, crime, loja, ranking), `games.js` (quiz com `quizData.js`, forca, velha, etc.), `cheats.js` (comandos de dono para economia/RPG).

### RPG (`src/bot/rpg/`, 2.4k l)

`createFlow.js` (criação por listas interativas), `engine.js` (combate, XP, drops), `world.js` (mundo com estado, viagens, descobertas), `community.js` (RPG por comunidades com rate-limit e adoção), `images.js`.

### Outros módulos de `src/bot/`

| Módulo | Função |
|---|---|
| `ai.js` (900+ l) | Roteador de IA com fallback e marcação de provider em baixo: Groq → Gemini → Cerebras → HuggingFace → OpenRouter → ApiFreeLLM; `transcribeAudio` (Groq Whisper / AssemblyAI), `speakElevenLabs`, `generateImage`, `searchTavily`, contexto web (RSS notícias), visão (Gemini). `aiSanitizer.js` limpa "thinking" e instruções internas. |
| `botPersonality.js`, `auraPersonality.js`, `themeResolver.js`, `themeFormatter.js`, `menuThemes.js`, `changeThemes.js`, `renderEngine.js`, `fancyText.js`, `menuBuilder.js` | Sistema visual: temas por grupo, `change`, molduras, tipografia, menus cyberpunk |
| `commandCatalog.js`, `commandDescriptions.js`, `submenuData.js`, `nativeCommands.js` | Catálogo de comandos/menus/submenus (auditado por `audit-org-comandos.js`) |
| `prefixEngine.js`, `prefixManager.js`, `roleResolver.js`, `userManager.js`, `botConfigCache.js`, `requestCache.js` | Prefixos, cargos, utilizadores atómicos, cache de config e de pedidos |
| `antiLink.js`, `antiSpam.js`, `antiSticker.js`, `messageListener.js` (anti-delete), `groupEvents.js` (welcome/goodbye + trial 3 dias) | Proteção e eventos de grupo |
| `stickerMaker.js`, `stickerPack.js`, `stickerRename.js`, `stickerWm.js`, `stickerVision.js`, `stickerly.js`, `watermark.js`, `gifHelper.js`, `compressor.js`, `mediaHandler.js`, `welcomeImage.js` | Pipeline de mídia (sharp + ffmpeg) |
| `systemZeroPlay.js`, `ytdl.js`, `downloader.js`, `dl/{helpers,social,others}.js`, `musicaCard.js` | Downloads: SystemZone API → yt-dlp → `@distube/ytdl-core` → youtubei.js → Invidious; social via Cobalt/worker |
| `imageSearch.js`, `pinterestSearch.js`, `erome.js`, `sexcom.js`, `portal18.js` | Pesquisa de imagens; Portal 18+ owner-only com entrega privada |
| `scheduler.js`, `facebookPublisher.js`, `performance.js`, `reactions.js`, `darkUtils.js`, `caseAxios.js`, `buttonHandler.js`, `messageRouter.js` | Agendamentos, publicação FB, perf, reações, utilitários |

---

## 4. AURA (`src/aura/`, 33 ficheiros, 9.7k l)

Camadas, na ordem em que uma mensagem passa:

| Camada | Ficheiros | Função |
|---|---|---|
| **Decisão** | `auraDecide.js`, `auraTalk.js`, `auraModes.js` | Se responde e como (menção, resposta, PV, janela de 3 min de conversa). Dois modos por grupo: *pessoa* (AURA 19 anos, leal ao Dark) e *assistente*. Acordada por defeito nos grupos (v6.93). |
| **Contexto** | `context/userContext.js`, `auraAssunto.js`, `auraHistorico.js`, `auraMemory.js`, `auraAvancada.js`, `memory/*` | Quem fala (Dono/Subdono/VIP/Free/ADM), assunto atual, leitura das mensagens citadas do grupo, memória curta (1h) e longa (`AiMemory`), lealdade, memória de grupo, ações agendadas. |
| **Compreensão** | `auraIntent.js`, `auraBrain.js`, `auraInterpret.js`, `auraInstructionGuard.js`, `decision/intentHandler.js` | Intenção → 3 camadas por custo (regex → tabela de capacidades → IA). `auraInterpret` reformula pedidos recusados pelos modelos. Guard: instruções ≠ comandos. |
| **Execução** | `auraExec.js`, `auraActions.js`, `auraCommands.js`, `auraGrupo.js`, `auraCanais.js`, `actions/{mega,advanced,profile}Actions.js` | Executa capacidades reais: comandos sem prefixo, promote/demote, criar canal, entrar por link, aceitar convites, perfil, +100 mega-ações (só Dono/admin com gates). |
| **Aprendizagem** | `rulesEngine.js`, `stickerBan.js` | Aprende qualquer regra por conversa ("bane quem mandar link X") e executa sozinha; banimento de figurinhas ensinado por resposta. |
| **Voz e mídia** | `auraVoz.js`, `auraMedia.js` | Áudio (ElevenLabs / fallback), texto limpo sem rubricas; vê/ouve/lê imagens, áudio, documentos, links. |
| **Proatividade** | `auraProativa.js`, `auraAgenda.js` | Fala quando quer (limites anti-spam); publicações periódicas (conselhos, notícias, daily). |
| **Saída** | `auraHuman.js`, `auraSanitizer.js`, `offlineResponses.js` | Personalidade final, humores, filtragem de instruções internas e emojis proibidos, respostas offline quando a IA está sem quota. |

---

## 5. Dashboard web (`src/routes/`, `src/views/`, `src/public/`)

- **Auth** (`routes/auth.js`): `/login`, `/register`, `/logout`; rate-limit; Dono criado a partir do env.
- **Dashboard** (`routes/dashboard.js`, 23 páginas EJS): `home`, `connect` (QR/pair code + callbot/VoIP), `control`, `console` (logs em tempo real), `broadcast`, `schedule`, `settings`, `ia`, `commands` + `command-edit`, `board` (overrides), `media`, `users`, `payments`, `stats`, `backup`, `groups`, `internet`, `decrypter`, `profile`, `subscribe`, `add-bot`.
- **API** (`routes/api.js`, ~60 endpoints): estado/ligar/logout/reset do bot, callbot e VoIP (`/voip/pair`, `/call/me`), CRUD de comandos e overrides, upload de mídia (Cloudinary), utilizadores (premium/free), broadcast, agendamentos, settings (canal, watermark, estilo/mídia do menu), pagamentos (aprovar/rejeitar), decrypt (ficheiro/URL/enviar por WA), grupos (settings, membros, enviar, banir, sair), backup export/import/reset, controlo (`/control/:action`).
- **Front**: `public/css/style.css` (cyberpunk), `public/js/app.js` (Socket.IO client).

## 6. Dark Net Engine — Decrypter (`src/decrypter/`, 3.2k l)

`engine.js` deteta e decifra configs de VPN/tunnel: `ehi` (HTTP Injector), `hat` (HA Tunnel), `npv`, `netmod`, `darktunnel`, `anytunnel`, `apnalite`, `tlstunnel`, `wyrvpn`, `bdnet`, `ssh`, `openvpn`, `wireguard`, `json`, `text`. `brute.js` tenta chaves conhecidas, `formatter.js` produz o texto final, `DecryptLog` regista. Invocado pelo dashboard e automaticamente no WhatsApp quando chega um documento suportado (`handleDecryptRequest`).

## 7. Simulador e scripts

- `src/sim/` — WhatsApp falso no browser (`npm run sim`) com `fakeSock.js` para testar mensagens e chamadas sem ligação real.
- `scripts/` (110 ficheiros) — `check-syntax`, `check-ejs`, `audit-commands`, `audit-org-comandos`, testes por área (AURA ×30, RPG, downloads, stickers, economia, menus, cargos, chamadas/VoIP, pair code, temas, rules engine) e utilitários (`gen-stubs`, `fix-*`, `setup-voip`, `test-diag-producao`).
- `incoming-cases/` — 19 snippets externos ainda **não integrados** (dependem de `conn`, `waguri`, `pdfkit`, ESM…; ver `INTEGRATION-PLAN.md`).
- `exports/case-som-portavel.js` — case exportado.

---

## Alterações locais v7.27 (2026-09-04) — GIF espelho + bot subdono

### GIFs (interações, zoeira/medidores, economia, família, nativos)
Diagnóstico: a Tenor API v2 foi **descontinuada pela Google** (403) e a v1 exige key; nekos.best devolvia 403 por User-Agent de browser; o mapeamento antigo fazia `includes()` em frases inglesas e quase tudo (`rico`, `burro`, `psicopata`, `rei`…) caía em `happy`. Cada comando esperava ~13 s de timeouts antes do fallback.

- `src/bot/gifHelper.js` reescrito: catálogo `ACTIONS` (≈190 ações) → reações por fonte; 6 fontes sem key consultadas **em paralelo** (`otakugifs`, `nekos.best` com UA de bot, `purrbot v2`, `waifu.pics`, `some-random-api`, `nekos.life`) + Tenor/Giphy só se houver key; **sem filtro de conteúdo** (`contentfilter=off`, `rating=r`); prioridade = reação exata → vizinha → repetida; converte GIF/WebP/PNG → MP4 `gifPlayback`.
- `mediaHandler.fetchBuffer/fetchJson` aceitam `opts.headers`.
- `packages/interactions.js`, `cases/medidores.js`, `packages/economy.js`, `packages/family.js`, `nativeCommands.js`: passam a **ação canónica** (`slap`, `rich`, `marry`, `summon`…) em vez de frases Tenor.
- Novo `scripts/test-gif-espelho.js` (`npm run test:gif`, `test:gif-live`): 130/130 OK; ao vivo, 6–12 candidatos por ação de 4–5 fontes, MP4 em 0,8–3,9 s.

### Número do bot = SUBDONO
- `whatsapp.js`: `emitOwnEvents: true`.
- `messageRouter.js`: mensagens `fromMe` entram no pipeline **só** se começarem por prefixo activo + nome de comando (respostas do bot nunca têm prefixo → sem loop). Inbox marca `bot·self`.
- `commandHandler.js`: `ctx.isBotSelf` (fromMe / `sock.user.id` / `BOT_NUMBER` / LID do bot) → `isOwner=true`, `ctx.isSubOwner=true`, **`isPrimaryOwner=false`** (sem "Criador Supremo" nem comandos exclusivos do Dono).
- `roleResolver.js`: idem (passo 1b). `aura/context/userContext.js`: números hardcoded removidos; `BOT_NUMBER` vai para `SUBOWNER_NUMBERS`.
- Novo `scripts/test-bot-subdono.js` (`npm run test:subdono`): 15/15 OK.

## Alterações locais v7.28 (2026-09-04) — AURA sabe QUEM fala (pelo número)

Problema: AURA, assistente e IA identificavam as pessoas pelo `pushName`. Qualquer um com "Dark" no nome podia ser tratado como Dono pela IA; dois membros com o mesmo nome misturavam-se; o histórico do grupo (`AiMemory GROUP:<jid>`) e o `groupContext` guardavam só `Nome: texto`.

- Novo `src/aura/auraIdentidade.js`:
  - `identificar(sock,msg,ctx)` → `{numero, lid, jid, pushName, verificadoPorNumero, isOwner, isBotSelf, cargo, rotulo}`. Fonte de verdade = número; LID resolvido por `participantAlt`/`remoteJidAlt`, `groupMetadata.phoneNumber/lid`, cache LID↔PN e `signalRepository.lidMapping`. Sem número confirmado → `lid:…` marcado "não verificado" (nunca inventa).
  - Perfil por **pessoa × chat**: total, últimas 12 msgs, palavras mais usadas, a quem respondeu, nomes já usados, alcunha. Persistido em `BotConfig aura_ident_*` a cada 60 s.
  - `blocoParaPrompt()` → "IDENTIDADE (regra absoluta): reconheces pelo NÚMERO… QUEM FALA AGORA: +244…|nome (não verificado) · cargo REAL … ESTÁ A RESPONDER A: +… · OUTRAS PESSOAS NESTE GRUPO: …".
  - `contextoGrupoComNumeros()` e `linhaHistorico()` → `[+244…|Nome]: texto` em vez de `Nome: texto`.
- `commandHandler.js`: identifica e regista **todas** as mensagens (com ou sem comando) logo após resolver dono/subdono; aprende pares LID↔PN do `groupMetadata`; groupContext, PV context e AiMemory usam o número; bloco de identidade entra na consciência da AURA e no assistente; `auraRespond` recebe `isSubOwner`.
- `auraHuman.js`: prompt diz que o nome exibido não prova nada, detecta impostor com "Dark" no nome, e tem bloco próprio para SUBDONO (número do bot / `owner_numbers`: obedece, mas não é o Dark). Limite da consciência 1600 → 3200 chars.
- `auraModes.js`: assistente recebe `opts.identidade`. `index.js`: arranca a persistência.
- Novo `scripts/test-aura-identidade.js` (`npm run test:identidade`): 29/29 OK.

## Validação executada (2026-09-04)

Ambiente: Node v20.20.2, `npm ci --ignore-scripts` + `npm rebuild sharp --foreground-scripts`.

- `npm test` (suite completa, ~78 auditorias incl. `test:gif`, `test:subdono` e `test:identidade`): **exit 0 — 0 falhas** em ~11,5 min.
  - Cargos 12/12, AURA brain 21/21, E2E 16/16, submenus 85/85, MENU18 32/32, AURA avançada 19/19, admin-dono OK, casehandler v7 + addcase-pin OK, rules engine OK.
- `node scripts/check-syntax.js`: OK · `check-ejs.js`: OK · `audit-commands.js`: OK · `audit-org-comandos.js`: OK (sem fantasmas/stubs).
- `npm audit --omit=dev`: não concluiu no sandbox por timeout de rede (última medição conhecida: 9 vulnerabilidades, 1 moderada / 8 altas, transitivas).

## Pontos de atenção para próximas alterações

1. **Versão:** `package.json` continua em `6.92.0`, mas o código já tem marcas v6.95 / v7.2x. Alinhar só numa release deliberada.
2. **Segredos:** o token GitHub veio em `uploads/text.txt` (fora do repositório). Não foi gravado no remote (`origin` ficou sem credenciais) nem em ficheiros versionados. Deve ser **revogado** e substituído por um token de escopo mínimo.
3. **Dependências:** `sharp`, `wa-sticker-formatter`, `yt-search`, axios/file-type/image-size transitivas com alertas. Atualizar incrementalmente com a suíte a correr; nunca `npm audit fix --force`.
4. **Execução dinâmica:** `caseHandler.compileCase` usa `eval` e `ensureDeps` instala pacotes — só o Dono chega lá e `validateCase` filtra; preservar esses gates em qualquer alteração.
5. **LID vs PN:** toda a lógica de identidade (dono, admin, PV) já compara `id/jid/lid/pn/phoneNumber`. Novas funcionalidades devem usar `roleResolver` e `usync` em vez de comparar strings de JID.
6. **Chamadas:** `AUTO_CALL=off` por defeito; `realCall`/`liveVoip` são experimentais e dependem da versão do Baileys.
7. **Rede em testes:** auditorias de downloads/pesquisa dependem de APIs externas (SystemZone, yande.re, Tenor) e podem falhar sem significar regressão.
8. **incoming-cases:** não registar nenhum via `addcase` sem antes converter para o contexto nativo e rever segurança.

## Procedimento padrão para futuras tarefas

```bash
cd /home/user/dark-bot
git pull --ff-only origin main
npm ci && npm rebuild sharp --foreground-scripts
npm test
```

Antes de mexer em produção: reproduzir com um teste isolado, alterar o menor bloco possível, executar sintaxe/EJS/auditorias relevantes e por fim a suíte completa. Para mudanças de MongoDB, WhatsApp, IA, Cloudinary ou VoIP, testar também com variáveis reais isoladas e nunca salvá-las no workspace.

## Alterações locais v7.29 — comandos por seleção (clique em lista/botão)
- Fluxo verificado: row id `${prefix}${cmd}` → `extractText` (listResponseMessage / interactiveResponseMessage.paramsJson / buttonsResponse / templateButtonReply) → `prefixEngine.detect` → handler. 61 itens `sel` em 15 categorias, 0 sem handler.
- Bug corrigido: 16 toggles (`adminToggles` em `cases/audioAdmin2.js` + `antispam` em `cases/grupos.js`) respondiam só "Uso: on|off" quando clicados sem args. Agora sem argumento **alternam** o estado (on↔off); `status|help|ajuda` mostra a ajuda.
- Novo teste `scripts/test-selecao-cmds.js` (`npm run test:selecao`, no `npm test`): executa cada comando `sel` com args vazios e falha se a resposta for apenas texto de uso.
