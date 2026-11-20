# 🤖 DARK BOT — Análise Completa & Plano de Melhorias

> **Versão analisada:** 9.20.0 · Commit `f4a9aa6` · 20/11/2026
> **Stack:** Node.js · Baileys (WhatsApp) · Express · MongoDB · Socket.IO · EJS
> **Linhas de código:** ~105.000 · 754 ficheiros · ~1.944 cases/comandos

---

## 📐 Arquitectura Geral

```
src/index.js (Ponto de entrada)
├── config.js (Variáveis de ambiente — segredos no Render)
├── database/connection.js (MongoDB)
├── Express + EJS (Dashboard web com 23 páginas)
├── Socket.IO (Logs em tempo real, eventos)
├── src/bot/whatsapp.js (Conexão Baileys — QR/pair-code)
│   └── messageRouter.js → messageListener.js → commandHandler.js
│       ├── caseHandler.js (~1944 cases estáticos + dinâmicos)
│       ├── packages/ (interactions, family, economy, games, cheats)
│       ├── nativeCommands.js
│       └── src/aura/ (AURA — IA conversacional + acções)
├── src/aura/ (56 ficheiros — AURA: IA, memória, decisão, execução)
├── src/bot/cases/ (68 ficheiros de casos)
├── src/bot/rpg/ (RPG completo com multiverso)
├── src/decrypter/ (Motor de decrypt VPN/túnel)
├── src/routes/ (API REST + dashboard)
└── src/sim/ (Simulador WhatsApp no browser)
```

---

## 🔧 Módulos e Funções Detalhadas

### 1. **Ponto de Entrada & Infraestrutura**

| Ficheiro | Função |
|---|---|
| `src/index.js` | Bootstrap: liga MongoDB, Express, Socket.IO, WhatsApp; seed do Dono; scheduler; reposição de avisos de grupo; healthcheck/ping |
| `src/config.js` | Central de configuração — lê ~60 variáveis do Render Environment |
| `src/database/connection.js` | Ligação MongoDB (obrigatório em produção) |
| `src/database/models/` | 24 modelos Mongoose: User, Command, BotConfig, Group, AiMemory, etc. |
| `src/middleware/auth.js` | Autenticação do dashboard (sessão + API key) |
| `src/middleware/controlAccess.js` | Controlo de acesso e derivação de secret de sessão |

### 2. **Bot WhatsApp (`src/bot/`)**

| Módulo | Função |
|---|---|
| `whatsapp.js` | Socket Baileys — QR/pair-code, reconexão com backoff, watchdog, failover de sessões |
| `mongoAuthState.js` | Persistência de credenciais WhatsApp em MongoDB (fallback: ficheiros locais) |
| `messageRouter.js` | Despacho de mensagens — deduplicação, normalização JID, paralelismo entre chats |
| `messageListener.js` | Cache de mensagens, actividade, anti-delete/spy opcional |
| `commandHandler.js` (248KB) | Normalização, prefixos, permissões, gates, limites Free; encaminha para cases/pacotes/AURA |
| `caseHandler.js` | Carrega ~1.944 cases estáticos + dinâmicos (addcase/delcase); detecta 4 formatos; sandbox |
| `ai.js` (900+ linhas) | **Roteador IA multi-provider com fallback:** Groq → DeepSeek → Gemini → Cerebras → HuggingFace → OpenRouter → ApiFreeLLM; transcrição (Whisper/AssemblyAI), TTS (ElevenLabs), geração de imagem, busca web (Tavily), visão (Gemini) |
| `downloader.js` / `dl/*.js` | Downloads: SystemZone → yt-dlp → @distube/ytdl-core → youtubei.js → Invidious; social via Cobalt |
| `antiLink.js` | Anti-link com whitelist por hostname (YouTube, Facebook, etc.) |
| `antiSpam.js` | Anti-flood / anti-spam |
| `antiSticker.js` | Moderação de figurinhas |
| `groupEvents.js` | Welcome/goodbye + trial 3 dias |
| `menuBuilder.js` | Construtor de menus com temas |
| `stickerMaker.js` / `stickerPack.js` / `stickerRename.js` | Pipeline de figurinhas com sharp + ffmpeg |
| `compressor.js` / `mediaHandler.js` / `watermark.js` | Processamento de mídia |
| `fancyText.js` / `themeFormatter.js` / `renderEngine.js` | Tipografia e temas visuais |
| `scheduler.js` | Agendamento de tarefas periódicas |
| `prefixEngine.js` / `prefixManager.js` | Gestão de prefixos por grupo |
| `roleResolver.js` / `userManager.js` | Resolução de cargos (Dono, Subdono, VIP, Free, ADM) |
| `botConfigCache.js` / `requestCache.js` | Cache de configuração e pedidos |
| `buttonHandler.js` / `listaEscolha.js` | Mensagens interativas (botões e listas) |
| `callHandler.js` / `callVoip.js` / `callBridge.js` | Chamadas de voz / VoIP |
| `spotifyTiers.js` | Sistema de tiers para Spotify |
| `imageSearch.js` / `pinterestSearch.js` | Pesquisa de imagens |
| `humanizer.js` | Naturalização de texto (evitar padrões de IA) |
| `reactions.js` | Reacções emoji em mensagens |

### 3. **AURA — Inteligência Artificial Conversacional (`src/aura/`, 56 ficheiros)**

A AURA é o motor de IA do bot — uma persona conversacional com memória, decisão contextual e capacidade de executar acções.

| Camada | Ficheiros | Função |
|---|---|---|
| **Decisão** | `auraDecide.js`, `auraTalk.js`, `auraModes.js` | Se responde e como (menção, PV, janela 3 min). Modos: *pessoa* (19 anos, leal) e *assistente* |
| **Contexto** | `auraContext.js`, `auraAssunto.js`, `auraHistorico.js`, `auraMemory.js`, `auraAvancada.js`, `memory/*` | Quem fala (cargos), assunto actual, memória curta (1h) e longa (`AiMemory`), memória de grupo |
| **Compreensão** | `auraIntent.js`, `auraBrain.js`, `auraInterpret.js`, `auraInstructionGuard.js` | Intenção → 3 camadas (regex → tabela → IA); reformula pedidos recusados; instruções ≠ comandos |
| **Execução** | `auraExec.js`, `auraActions.js`, `auraCommands.js`, `auraGrupo.js`, `auraCanais.js`, `actions/*` | Executa capacidades: comandos sem prefixo, promote/demote, criar canal, +100 mega-ações |
| **Aprendizagem** | `rulesEngine.js`, `stickerBan.js` | Aprende regras por conversa ("bane quem mandar link X"); ban de figurinhas por resposta |
| **Voz & mídia** | `auraVoz.js`, `auraMedia.js` | Áudio (ElevenLabs), vê/ouve/imagens, documentos, links |
| **Proactividade** | `auraProativa.js`, `auraAgenda.js` | Fala quando quer (limites anti-spam); publicações periódicas |
| **Saída** | `auraHuman.js`, `auraSanitizer.js`, `offlineResponses.js` | Personalidade, humores, filtra instruções internas, respostas offline |
| **Identidade** | `auraIdentidade.js`, `auraSelfie.js`, `auraEmoji.js` | Persona goth ficcional; selfies virtuais; 571 emojis curados por contexto/humor |
| **Confirmação** | `auraConfirmacao.js` | Exige CONFIRMAR/CANCELAR para acções destrutivas (apagar canal, sair grupo, limpar chat) |
| **Vontade** | `auraVontade.js`, `auraVigilante.js` | Vontades/interesses próprios; vigilância do grupo |
| **Sorteios/Votação** | `auraSorteios.js`, `auraVotacao.js` | Sorteios e votações |
| **Visão** | `auraViewOnce.js` | Processa mensagens view-once |
| **Agente** | `auraAgent.js` | Agente autónomo com tarefas |
| **Contextual** | `auraContextual.js` | Respostas contextuais baseadas no grupo |
| **Diálogo** | `auraDialogue.js`, `auraConversation.js` | Gestão de conversa contínua |

### 4. **Cases / Comandos (`src/bot/cases/`, 68 ficheiros)**

| Área | Ficheiros | Exemplos de comandos |
|---|---|---|
| **Downloads** | `downloads.js`, `downloads2.js`, `musica.js` | !play, !play2, !play3, !ytd, !gyt, TikTok, IG, FB, Twitter, Spotify |
| **Figurinhas** | `stickers.js`, `stickers2.js`, `stickerly.js`, `pack.js`, `figcategorias.js`, `stickerBan.js` | Criar, packs, renomear, watermark, categorias, ban por hash |
| **IA** | `ia.js`, `ia2.js`, `auraAgent.js`, `auraHub.js`, `auraVidaCase.js` | !gpt, !imagine, !transcrever, !tts, acordar/dormir AURA |
| **Admin de Grupos** | `grupos.js`, `adminExtra.js`, `audioAdmin2.js`, `online.js`, `medidores.js`, `canal.js` | !ban, !add, !antilink, !welcome, !antispam, !tagall |
| **Economia** | `economia2.js`, `interacoes2.js`, `jogos2.js`, `random.js` | !trabalhar, !daily, !roubar, !loja, !ranking, jogos |
| **RPG** | `rpg2.js`, `rpgSetup.js`, `rpgWorld.js`, `rpgCommunity.js`, `rpgRegions.js`, `rpgTrade.js`, `rpgVisuals.js` | !aventura, !combate, !inventario, !craft, mundo, multiverso, comunidades |
| **Pesquisas** | `search2.js`, `texto2.js`, `logos.js`, `info.js` | Pinterest, wiki, texto fancy, logos, menus |
| **Premium/Planos** | `premium.js`, `rental2.js`, `finalizar.js`, `perf.js` | Planos VIP, aluguel de grupos, checkout |
| **Temas** | `change.js`, `dynamicSubmenus.js`, `setmenu.js` | Temas visuais, submenus dinâmicos |
| **Chamadas** | `chamadas.js`, `chamadaVoz.js` | Comandos de chamadas |
| **Divulgação** | `divulgacao.js` (103KB — o maior!) | Sistema de divulgação em massa |
| **Central de Grupos** | `centralGrupos.js` | Gestão centralizada de grupos |
| **Votação** | `votacao.js` | Enquetes |
| **Welcome** | `welcm.js` | Mensagens de boas-vindas |
| **Incoming** | `incomingAdmin.js`, `incomingGames.js`, `incomingTools.js` | Casos externos pendentes de integração |

### 5. **RPG Completo (`src/bot/rpg/`, 18 ficheiros)**

| Módulo | Função |
|---|---|
| `createFlow.js` | Criação de personagem por listas interativas |
| `engine.js` | Combate, XP, drops, inventário |
| `world.js` | Mundo com estado, viagens, descobertas |
| `multiverse.js` | Multiverso (múltiplos mundos) |
| `community.js` | RPG por comunidades com rate-limit e adoção |
| `combat.js` | Motor de combate |
| `trade.js` | Sistema de trocas |
| `storyMode.js` | Modo história |
| `regions.js` | Regiões geográficas |
| `catalog.js` / `carousel.js` | Catálogos e carrosséis visuais |
| `ui.js` | Interface de utilizador |
| `images.js` | Imagens por universo (Demon Slayer, JJK, One Piece, Naruto, Dragon Ball, etc.) |
| `visuals.js` / `rpgTheme.js` | Temas visuais |

### 6. **Dashboard Web (`src/routes/`, `src/views/`)**

- **23 páginas EJS** com tema cyberpunk
- **~60 endpoints API**
- **Funcionalidades:**
  - Login/Registo com rate-limit
  - QR/pair-code para ligar o bot
  - Consola com logs em tempo real (Socket.IO)
  - CRUD de comandos e overrides
  - Upload de mídia (Cloudinary)
  - Gestão de utilizadores (premium/free)
  - Broadcast, agendamentos
  - Configurações (canal, watermark, estilo do menu)
  - Pagamentos (aprovar/rejeitar)
  - Decrypt de ficheiros VPN/túnel
  - Gestão de grupos (settings, membros, banir)
  - Backup export/import/reset
  - Perfil, subscrição, adicionar bot

### 7. **Dark Net Engine — Decrypter (`src/decrypter/`)**

Deteta e decifra configs de VPN/túnel: ehi, hat, npv, netmod, darktunnel, anytunnel, apnalite, tlstunnel, wyrvpn, bdnet, ssh, openvpn, wireguard, json, text.

### 8. **Simulador (`src/sim/`)**

WhatsApp falso no browser (`npm run sim`) — teste sem ligação real ao WhatsApp.

---

## 📊 Números

| Métrica | Valor |
|---|---|
| Linhas de código JS | ~105.000 |
| Ficheiros totais | 754 |
| Cases/comandos | ~1.944 |
| Ficheiros AURA | 56 |
| Ficheiros de cases | 68 |
| Modelos MongoDB | 24 |
| Páginas do dashboard | 23 |
| Endpoints API | ~60 |
| Providers IA | 8 (Groq, DeepSeek, Gemini, Cerebras, HuggingFace, OpenRouter, ApiFreeLLM, OpenAI) |
| Scripts de teste | ~110 |
| RPG universos | 8+ (Demon Slayer, JJK, One Piece, Naruto, Dragon Ball, Bleach, Solo Leveling, DMC, ruptura) |

---

## 🔴 Problemas Identificados & Melhorias Propostas

### 🔥 PRIORIDADE ALTA — Estabilidade & Segurança

#### 1. **Fila de mensagens sem backpressure** (Prioridade: CRÍTICA)
**Problema:** `messageRouter.js` permite mensagens simultâneas ilimitadas. Quando o limite é atingido, novos pedidos entram numa fila sem máximo, expiração ou descarte.

**Melhoria proposta:**
```javascript
// Limitar fila a 50 mensagens com TTL de 2 minutos
const MAX_QUEUE = 50;
const QUEUE_TTL_MS = 120_000;
// Descartar mensagens antigas com log de métricas
```

#### 2. **Caches sem limite (memory leak)** (Prioridade: CRÍTICA)
**Problema:** `auraModes._cache`, `commandHandler._msgCount`, `auraTalk._fala` são Maps sem TTL/limite. Crescem com uptime longo e muitos grupos.

**Melhoria proposta:**
- Implementar LRU cache com limite máximo (ex.: 1.000 entradas)
- Adicionar varredura periódica (setInterval) para limpar entradas expiradas
- Adicionar métricas de tamanho de cada cache ao `/health`

#### 3. **Timeout IA não aborta requests HTTP** (Prioridade: ALTA)
**Problema:** `withTimeout()` em `ai.js` não aborta o request HTTP anterior quando muda de provider. Se 8 providers falham, pode esperar ~176s (8 × 22s).

**Melhoria proposta:**
```javascript
// Orçamento total de 30-45s com AbortController propagado
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
// Passar signal para todos os providers
```

#### 4. **Acções destrutivas sem confirmação** (Prioridade: ALTA)
**Problema:** `canal_apagar`, `sair_grupo`, `limpar_chat` executam sem confirmação visual — basta classificar errado a frase.

**Melhoria proposta:** Implementar sistema de confirmação com expiração de 60s (já existe `auraConfirmacao.js` mas precisa ser activado no fluxo principal).

#### 5. **`uncaughtException` não reinicia o processo** (Prioridade: ALTA)
**Problema:** O processo continua vivo mas em estado inconsistente após `uncaughtException`.

**Melhoria proposta:**
```javascript
process.on('uncaughtException', (err) => {
  console.error('FATAL:', err);
  // Shutdown curto e sair para o supervisor reiniciar
  setTimeout(() => process.exit(1), 5000);
});
```

#### 6. **Socket preso em `connecting` sem timeout geral** (Prioridade: ALTA)
**Problema:** O watchdog só actua quando `connected` + WebSocket fechado. Se ficar preso em `connecting`, não há recuperação.

**Melhoria proposta:** Deadline de 60-90s para handshake; no timeout, fechar socket e reagendar tentativa.

---

### 🟡 PRIORIDADE MÉDIA — Código & Arquitectura

#### 7. **`commandHandler.js` é um monólito de 248KB**
**Problema:** Um ficheiro com ~2.500 linhas que mistura normalização, despacho, permissões, AURA e casos.

**Melhoria proposta:** Extrair para módulos:
- `normalizeMsg.js` — normalização
- `resolvePermission.js` — permissões
- `dispatchCommand.js` — despacho
- `applyLimits.js` — limites e gates

#### 8. **`divulgacao.js` (103KB) — módulo gigante**
**Problema:** 103KB num só ficheiro — difícil de manter e testar.

**Melhoria proposta:** Dividir em:
- `divulgacao/scheduler.js`
- `divulgacao/templates.js`
- `divulgacao/targets.js`
- `divulgacao/rateLimit.js`

#### 9. **Validação de cases dinâmicos insuficiente**
**Problema:** `caseHandler.js` bloqueia `eval`, `Function()`, `child_process` mas pode haver outros vetores de escape (ex.: `import()`, `require.resolve`, prototype pollution).

**Melhoria proposta:**
- Usar `vm2` ou `isolated-vm` para sandbox real
- Whitelist de módulos permitidos
- Limite de tempo de execução por case

#### 10. **Sem testes E2E com WhatsApp real**
**Problema:** ~110 scripts de teste mas todos são mocks/unitários. Nenhuma integração real.

**Melhoria proposta:**
- Configurar suite E2E com Baileys + conta de teste
- Testes de regressão para fluxos críticos: play, anti-link, welcome, AURA
- CI/CD com GitHub Actions

#### 11. **Duplicação de lógica de permissões**
**Problema:** Permissões verificadas em `commandHandler.js`, `roleResolver.js`, cada case, cada rota da API — sem fonte única.

**Melhoria proposta:** Centralizar num módulo `permissionEngine.js` com decorator pattern:
```javascript
@requireRole('admin')
async function banUser(ctx, target) { ... }
```

#### 12. **Sem rate-limit global na API**
**Problema:** Rotas da API podem ser bombardeadas.

**Melhoria proposta:**
- `express-rate-limit` com 100 req/min por IP
- Rate-limit por utilizador autenticado
- Throttle específico para endpoints pesados (broadcast, decrypt)

---

### 🟢 PRIORIDADE BAIXA — Funcionalidades Novas

#### 13. **Sistema de métricas e observabilidade**
**Melhoria proposta:**
- Métricas Prometheus: mensagens/s, latência IA, providers down, cache sizes
- Dashboard de monitoring (Grafana ou página interna)
- Alertas para quando providers de IA caírem

#### 14. **Migração para TypeScript**
**Melhoria proposta:**
- Migrar gradualmente — começar por `src/config.js`, `src/aura/`
- Tipagem de models (interfaces para Command, User, Group)
- Melhoria na manutenção e refactoring seguro

#### 15. **Plugin system para cases**
**Melhoria proposta:**
- Permitir que cases sejam carregados como plugins externos
- Marketplace de cases (o sistema de `incoming-cases/` já é um primeiro passo)
- Versionamento de cases

#### 16. **Melhorias na AURA**
- **Personalidade por grupo:** cada grupo pode customizar a persona da AURA (nome, estilo, tom)
- **Aprendizagem federada:** regras ensinadas num grupo podem ser sugeridas para outros (com aprovação do Dono)
- **Modo "estudo":** AURA pode pesquisar e aprender sobre temas antes de responder
- **Multi-idioma nativo:** detecção automática de idioma + resposta no mesmo idioma

#### 17. **Sistema de backup automático**
**Melhoria proposta:**
- Backup diário do MongoDB para Cloudinary/S3
- Snapshot de sessões WhatsApp
- Exportação de configurações por grupo

#### 18. **Melhorias no RPG**
- Editor visual de mapas
- Sistema de achievements global
- Cross-community events (batalhas entre comunidades RPG)
- Leaderboards com rankings semanais/mensais

#### 19. **Integração com outras plataformas**
- Telegram bridge (mensagens entre WhatsApp e Telegram)
- Discord bridge para grupos
- API pública para bots de terceiros

#### 20. **Performance & Escalabilidade**
- **Redis para caches** em vez de Maps em memória
- **Workers** para processamento de mídia (sharp, ffmpeg)
- **Queue system** (Bull/BullMQ) para tarefas pesadas
- **Sharding** para múltiplas instâncias do bot

---

## 🏗️ Recomendações de Infraestrutura

### Deploy (melhorias)

| Actual | Proposta |
|---|---|
| Render (single instance) | Render + Redis + MongoDB Atlas |
| Sem CDN | Cloudflare para assets |
| Sem monitoramento | UptimeRobot + Sentry para erros |
| Sem CI/CD | GitHub Actions: lint + test + deploy |
| Sem backup | Cron diário → S3/Cloudinary |

### Segurança

| Actual | Proposta |
|---|---|
| `.env.example` com placeholders | Vault/Secret Manager |
| Rate-limit parcial | Rate-limit global + WAF |
| Sem auditoria de logs | Audit trail para acções do Dono |
| Cases com sandbox frágil | `vm2` ou `isolated-vm` |
| Sem 2FA no dashboard | TOTP/2FA para login |

---

## 📋 Plano de Acção Prioritário

### Fase 1 — Estabilidade (1-2 semanas) ✅ IMPLEMENTADO v9.21
1. ✅ Corrigir fila de mensagens (backpressure) — `MAX_FILA=50`, TTL 2min, `queueStats()` no /health
2. ✅ Adicionar LRU a todos os caches — `lruCache.js` (LRU+TTL+sweep) aplicado em auraModes, commandHandler, auraTalk
3. ✅ Orçamento total de timeout IA — já existia (budget.total + AbortSignal), verificado
4. ✅ Confirmação para acções destrutivas — já existia em `auraConfirmacao.js`, documentado
5. ✅ `uncaughtException` → restart — schedule exit(1) após 5s com log
6. ✅ Timeout de conexão WhatsApp — watchdog agora detecta 'connecting' > 90s

### Fase 2 — Refactoring (2-4 semanas)
7. ⬜ Dividir `commandHandler.js` em módulos
8. ⬜ Dividir `divulgacao.js`
9. ⬜ Sandbox de cases com `vm2`
10. ⬜ Rate-limit global na API
11. ⬜ Centralizar permissões

### Fase 3 — Observabilidade (1-2 semanas)
12. ✅ Métricas no `/health` — queue stats adicionado
13. ⬜ Logs estruturados (JSON)
14. ⬜ Sentry ou equivalente
15. ⬜ Dashboard de monitoring

### Fase 4 — Funcionalidades (contínuo)
16. ⬜ Plugin system para cases
17. ⬜ Personalidade por grupo na AURA
18. ⬜ Backup automático
19. ⬜ Redis para caches
20. ⬜ TypeScript gradual
21. ✅ Conversão view-once ↔ normal — `!revelar`, `!toviewonce`, `!listviewonce`

---

## 🎯 Conclusão

O DARK BOT é um projecto **extremamente ambicioso e funcional** com:
- ✅ ~1.944 comandos operacionais
- ✅ IA conversacional completa (AURA) com memória, personalidade e acções
- ✅ RPG complexo com multiverso
- ✅ Dashboard web profissional
- ✅ Sistema de decrypt VPN/túnel
- ✅ Anti-spam, anti-link, moderação completa

Os principais pontos de melhoria concentram-se em:
1. **Estabilidade** — backpressure, timeouts, caches
2. **Segurança** — sandbox de cases, rate-limit, confirmações
3. **Manutenibilidade** — dividir monólitos, TypeScript
4. **Observabilidade** — métricas, logs, alertas
5. **Escalabilidade** — Redis, workers, sharding

O código está funcional mas precisa de maturação arquitectónica para produção de grande escala. As melhorias propostas na Fase 1 são essenciais antes de qualquer crescimento de utilizadores.
