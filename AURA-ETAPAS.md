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

## ⏭️ ETAPA 3 — STATUS, CANAIS E COMUNIDADES

- **Status/estados**: ver os estados dos contactos (texto/foto/vídeo).
- **Canais**: subscrever, ler posts, comentar/reagir.
- **Comunidades**: ver grupos, adicionar/remover, gerir membros.
- **"Ler e entrar"**: quando mandam link de canal/grupo/comunidade, a AURA
  entra (se autorizada) e reporta o que há lá.

## ⏭️ ETAPA 4 — GESTÃO DE CANAL COMPLETA

- Criar canal, editar nome/descrição/foto, agendar posts, responder comentários,
  estatísticas — tudo **por comando ou por voz**, com permissões de Dono.

## 🔒 Regras sempre válidas

- Comandos destrutivos/de Dono **nunca** são executados por terceiros.
- A AURA **nunca** partilha dados sensíveis que memorizou com outros chats.
- Tudo com testes (`npm test` verde a cada etapa).
