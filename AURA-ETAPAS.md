# DARK BOT — AURA Completa (roadmap por etapas)

> O objectivo: a AURA saber tudo o que se passa — ver, ouvir, ler e agir —
> distinguindo o que é importante do que não é, e receber comandos por voz.
> Cada etapa é implementada COMPLETA e FUNCIONAL antes de passar à seguinte.

## ✅ ETAPA 1 — AURA MULTIMODAL (feita — v7.8)

A AURA agora **vê, ouve e lê** tudo o que recebe no privado/grupo:

| Entrada | Comportamento |
|---|---|
| 📸 Foto | **Vê de verdade** (Gemini Vision descreve o que está na imagem) |
| 🎬 Vídeo/GIF | legenda + tipo (GIF/reel) |
| 🎧 Áudio de voz | **Transcrição Whisper** → responde ao que foi dito |
| 🎵 Áudio/música | transcrição → comenta |
| 📄 Documento | `.txt/.md/.csv/.json...` lido directamente; **PDF via Gemini** |
| 🔗 Link | **Lê o conteúdo da página** (web digest) e comenta/age |
| 👁️ View-once | **Desembrulha** e processa o conteúdo real |
| 🎨 Sticker | visão (já existia) |

**Memória inteligente:** cada mídia gera um **resumo**; a heurística decide:
- *importante* (factos, dados sensíveis, mídia com legenda longa) → **fica para sempre**
- *o resto* → some em 1 hora

Ficheiros: `src/aura/auraMedia.js`, `src/aura/auraMemory.js`, `src/bot/ai.js` (`chatWithDocument`), integração no `src/bot/commandHandler.js`.
Testes: `npm run test:auramidia` (28/28).

## ✅ ETAPA 2 — VOZ COMPLETA (feita — v7.8)

A AURA agora **recebe comandos por voz** e **responde por voz**:

| Comportamento | Como funciona |
|---|---|
| 🎤 **Comando por voz** | a transcrição do PTT é passada pelo GATE (ordem OU comando conhecido) → segue o MESMO caminho dos comandos escritos: cérebro da AURA (`auraBrain`) → acções (`auraActions`) → comandos (`auraCommands`). "toca Shakira", "qual o meu saldo", "promove o João", "cria um grupo", "manda um áudio"… tudo funciona por áudio. |
| 🎧 **Voz entra → voz sai** | quando entra um áudio (PTT do Dono ou no PV), a resposta também é FALADA (TTS → PTT). Já existia; mantido e coberto por teste. |
| 📞 **Chamadas** | callback RTP (v7.2) usa a mesma transcrição/conversa — integrado. |

- O GATE é regex barata (0 ms, sem IA): `pareceOrdem || detectarComando`.
  Conversa normal ("oi", "gostei da foto") NUNCA é tratada como comando.
- Ficheiros: `src/bot/commandHandler.js` (bloco de áudio) + teste
  `npm run test:auravozcompleta` (27/27).

## ✅ ETAPA 3 — STATUS, CANAIS E COMUNIDADES (feita — v7.9)

A AURA agora cobre **status, canais e comunidades** por conversa (e por voz,
via o mesmo GATE da Etapa 2), e executa a maioria dos comandos do bot em
linguagem natural (~90% do cardápio: informação, economia, moderação,
grupos, canais, comunidades).

| Pedido natural | O que acontece |
|---|---|
| "status do grupo" / "como está o grupo" | comando real `statusgp` |
| "status do bot" / "o bot tá vivo?" | comando real `statusbot` |
| "meu status" / "como estou" | comando real `meustatus` (coins/aura/nível) |
| "sou vip" | comando real `myvip` |
| "qual é o teu canal" | comando real `ca` |
| "quem está ativo no grupo" / "líderes do grupo" | `checkativo` / `lider` |
| "qual é o meu recado" / "teu status" / "status do @fulano" | **lê o recado via USync** (`src/bot/usync.js`) |
| "como está o canal <link>" / "info do canal" | nome, descrição, seguidores |
| "segue o canal <link>" | `newsletterMetadata('invite')` + `newsletterFollow` |
| "deixa de seguir o canal <link>" | `newsletterUnfollow` |
| "entra <link de comunidade>" | `communityGetInviteInfo` → `communityAcceptInvite` |
| "info da comunidade" / "grupos da comunidade" | `communityMetadata` (dentro de um grupo dela) |

- **Fixes importantes**: "deixa de seguir o canal" já não é confundido com
  "segue o canal" (a ordem no catálogo importa); links `chat.whatsapp.com`
  agora distinguem **grupo vs comunidade**.
- Informativos (`statusgp`, `statusbot`, `meustatus`, `myvip`, `ca`,
  `checkativo`, `lider`, `infoff`) ficaram **livres para todos**.
- Ficheiros: `src/bot/usync.js` (novo), `src/aura/auraBrain.js`,
  `src/aura/auraExec.js`, `src/aura/auraCanais.js`, `src/aura/auraCommands.js`,
  `src/aura/auraActions.js`. Testes: `npm run test:auraetapa3` (45/45).

## ✅ ETAPA 4 — GESTÃO DE CANAL COMPLETA (feita — v7.10)

A AURA **cria, gere e agenda o canal do bot** — tudo por conversa ou voz,
só para o Dono (as estatísticas são livres).

| Pedido natural | O que acontece |
|---|---|
| "cria um canal chamado X [com a descrição Y]" | `newsletterCreate` + **guarda o canal** (MongoDB via `botConfigCache`) |
| "muda o nome do meu canal para X" | `newsletterUpdateName` |
| "muda a descrição do meu canal para X" | `newsletterUpdateDescription` |
| "põe esta foto no canal" (envia a imagem) | `newsletterUpdatePicture` |
| "tira a foto do canal" | `newsletterRemovePicture` |
| "estatísticas do meu canal" / "como está o meu canal" | seguidores + admins + link |
| "posta no canal: X" | **publica de verdade** (antes só gerava o texto e não postava) |
| "agenda um post no canal todos os dias" | agenda real (reutiliza `auraAgenda`) |
| "apaga o meu canal" | `newsletterDelete` (destrutivo, só Dono) |

- O canal criado é **lembrado** (`aura_canal`), por isso "o MEU canal"
  funciona sem link, mesmo depois de reiniciar (Render free).
- Fix: `canal_postar` publicava em `gerar` e o texto nunca chegava ao canal.
- `VERBO_ORDEM` ganhou `mostra|mostre|mostrar` ("mostra as estatísticas").
- Ficheiros: `src/aura/auraCanais.js`, `src/aura/auraBrain.js`,
  `src/aura/auraExec.js`, `src/aura/auraActions.js`.
  Testes: `npm run test:auraetapa4` (39/39).

## ✅ ETAPA 5 — VER O GRUPO E FALAR COM QUEM O DARK QUISER (feita — v7.11)

A AURA agora **vê as mensagens do grupo de verdade** (via `messageCache` do
messageListener — memória real do que chegou, nunca invenção) e **dirige a
fala a quem o Dark mandar**.

| Pedido natural | O que acontece |
|---|---|
| "quem escreveu isso?" (a responder a uma msg) | lê a mensagem **citada** e diz o autor com o texto — 100% certo |
| "quem escreveu X?" | varre as últimas ~300 msgs do grupo e devolve autor + texto exacto |
| "quem escreveu Y?" (ninguém) | responde com certeza: "ninguém escreveu isso nas últimas N mensagens" |
| "o que é que o João escreveu?" | resolve o nome→jid e lista as últimas mensagens dele |
| "o que o 2449… mandou?" | também resolve por número |
| "fala só com o João [que …]" | responde a mencionar **só** essa pessoa (`@` real) |
| "diz a todos que …" / "avisa todos do grupo" | menciona **o grupo inteiro** (menos o bot) |

- **Sem dúvida**: se não há prova (sem citação nem termo), ela **não inventa** —
  deixa a conversa normal responder.
- O contexto que a IA recebe passou de 5 → **10 mensagens** com o nome de
  quem escreveu, para acompanhar melhor a conversa.
- `VERBO_ORDEM` ganhou `fala|falar|diz|diga|avisa|anuncia|chama` → estas
  ordens também funcionam **por voz**.
- Permissões: consultas (`quem escreveu`, `o que escreveu`) são livres;
  `falar_com` / `falar_com_todos` são só do Dono.
- Ficheiros: `src/aura/auraHistorico.js` (novo), `src/aura/auraBrain.js`,
  `src/aura/auraExec.js`, `src/bot/commandHandler.js` (contexto do grupo).
  Testes: `npm run test:auraetapa5` (40/40).

## 🔒 Regras sempre válidas

- Comandos destrutivos/de Dono **nunca** são executados por terceiros.
- A AURA **nunca** partilha dados sensíveis que memorizou com outros chats.
- Tudo com testes (`npm test` verde a cada etapa).
