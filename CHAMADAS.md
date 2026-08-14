# DARK BOT — Chamadas de voz e vídeo (v6.68)

## O limite que não consigo contornar — e porquê

Antes de escrever código, auditei o `@systemzero/baileys` 1.1.1 linha a linha:

| Primitiva | Existe? |
|---|---|
| `sock.rejectCall(callId, callFrom)` | ✅ sim |
| Evento `'call'` (offer/ringing/accept/reject/timeout/terminate, `isVideo`, `isGroup`) | ✅ sim |
| `acceptCall` / `answerCall` | ❌ **não existe** |
| WebRTC / SRTP / ICE / DTLS | ❌ **não existe** |

Entrar no áudio de uma chamada obriga a negociar SDP, abrir ICE, cifrar SRTP e
bombear pacotes RTP em tempo real. O Baileys é um cliente de **sinalização por
WebSocket** — não tem pilha de média nenhuma. O issue oficial
[Calls support #40](https://github.com/WhiskeySockets/Baileys/issues/40) está
aberto desde 2023 exactamente por isto.

**Não te vou vender um stream de áudio que a biblioteca não tem.** O que
implementei é a coisa mais próxima que funciona a sério — e funciona mesmo.

## Chamada ao vivo (RTP)

Ferramenta testada: **baileys-caller** (WASM VoIP do WhatsApp Web).

| | |
|---|---|
| Voz 1:1 de **saída** | possível, se existir sessão em `data/auth-voip` |
| Atender **entrada** | a lib **não faz** |
| Vídeo | a lib **não faz** |
| Grupo | a lib **não faz** |

Não está nas dependencies do Render: o módulo nativo `wrtc` rebenta o build Free. O bot principal **não depende** disto. Sem a lib ou sem o 3.º QR, cai no PTT (como já estava).

---

## v6.73 — Baileys secundário só para chamadas

Há agora **dois aparelhos ligados** no mesmo número:

1. **Bot principal** — mensagens, menus, AURA, grupos
2. **Call-Baileys** — só o evento `call` + notas de voz durante a chamada

A sessão do segundo fica em `call:creds` no MongoDB. **Não partilha credenciais** com o principal (isso dava 440).

No dashboard → **Conectar**: gera o QR/Pair do bloco *Baileys de Chamadas* **depois** do bot principal já estar online. Escaneia como segundo dispositivo.

Se o call-bot estiver ligado, o principal deixa as chamadas para ele.

---

## v6.72 — o que mudou agora

- Mensagens reais do WhatsApp (ephemeral / viewOnce / edited) são **desembrulhadas** antes de a AURA as ver. Sem isto o PV chegava vazio.
- Notas de voz, fotos e stickers **sem legenda** no privado já activam a AURA.
- O prefixo `!` deixou de calar os comandos do bot para quem não é o Dono.
- Chamadas: tenta `acceptCall`, `answerCall`, IQ `accept` e `sendNode`. Se o WhatsApp não der stream (não dá no Baileys), conversa por PTT: atende, fala, ouve, entende, responde.

---

## O que ela faz agora

### Modo `atender` — conversa por voz (v7.2: callback com voz REAL)

Quando ligam para a Aura:

1. **VOZ REAL (novo):** se a sessão VoIP (3.º aparelho) existir, a Aura
   **rejeita a entrada e LIGA DE VOLTA** com áudio RTP real — ela *fala*
   (saudação por TTS) e *ouve* (RTP → transcrição → resposta).
2. **Fallback:** sem sessão VoIP, mantém o comportamento anterior — atende
   o sinal e conversa por notas de voz (PTT).

**Regras de segurança do callback:**
- só voz (vídeo mantém o fluxo PTT);
- só para o **Dono** — ou para quem o Dono pôs o modo explicitamente em
  `atender` (`.chamadas atender`) — para não ligar de volta a estranhos;
- cooldown de 60 s por número (anti-spam/ban).

1. **ATENDER** → detecta a chamada e assume-a (não fica a tocar)
2. **FALAR** → manda logo um áudio PTT a atender a pessoa
3. **OUVIR** → a nota de voz dela é transcrita (Groq Whisper → AssemblyAI)
4. **ENTENDER** → o texto vai à AURA com contexto de chamada
5. **RESPONDER** → ela responde **em áudio**, e a conversa continua

É uma chamada assíncrona por notas de voz: atende, fala, ouve, percebe e
responde. O áudio viaja como PTT em vez de stream RTP — a diferença é essa.
A janela fica aberta 5 minutos; a pessoa despedir-se (`tchau`, `desliga`,
`até logo`) encerra logo.

### Modo `rejeitar` — padrão para estranhos
Rejeita e manda uma mensagem educada a pedir que deixem texto. Notifica-te.

### Modo `ignorar`
Deixa tocar, não faz nada.

## Comandos

```
.chamadas            → ver o modo e o estado actual
.chamadas atender    → atende e conversa por voz
.chamadas rejeitar   → rejeita com mensagem educada
.chamadas ignorar    → deixa tocar
.desligar            → termina a conversa activa
```

Padrão: **atender** contigo, **rejeitar** com os outros. O modo é por chat e
fica guardado no MongoDB (`darkbot_call_modes_v1`), por isso sobrevive aos
reinícios do Render.

## Auditoria: `npm run test:chamadas` — 29/29

Não é só "a função existe". A volta completa foi corrida **com bytes reais**:

```
▸ J. Volta REAL: falar → bytes → ouvir
  ✅ TTS devolve MP3 real → 31808 bytes, magic 49443304
  ✅ Transcrição devolve o que foi dito → "Oi Dark, estou aqui a ouvir."
```

O ElevenLabs gerou 31 KB de MP3 (magic bytes `4944` = ID3, válido), e o Groq
Whisper transcreveu-o de volta palavra por palavra. O ciclo fecha.

O resto do teste cobre:

- **Limites da API** verificados no código-fonte (`rejectCall` existe,
  `acceptCall` não)
- Modos: padrões, gravação, persistência, modo inválido recusado
- Rejeitar: rejeita mesmo, avisa quem ligou, notifica o Dono
- Ignorar: zero acções
- Atender: assume, fala em PTT (113 KB), fica activa, não se auto-notifica
- Só `offer` conta — `ringing`/`accept`/`reject`/`timeout`/`terminate` ignorados
- Despedidas: 6/6 reconhecidas, 4/4 conversas normais não confundidas
- Ciclo: ouviu → respondeu → em áudio → contou o turno
- Despedida encerra; sem chamada activa não responde
- Áudio impercetível → pede para repetir (não fica calada)
- Emojis e markdown limpos antes do TTS (`*Olá* 🖤 _Dark_` → `Olá meu Dark`)

Suite completa: **393 testes, 0 falhas**.

## O que ainda depende do WhatsApp real

Isto foi validado com socket simulado (construído a partir do código-fonte do
Baileys) mais a volta real de TTS/transcrição. O que só o WhatsApp verdadeiro
confirma:

1. Se o `rejectCall` chega a tempo antes do WhatsApp desistir sozinho.
2. Se a pessoa recebe o PTT imediatamente a seguir à chamada cair.
3. Rate-limits do WhatsApp em áudios seguidos.

Liga para o bot e diz-me o que acontece.
