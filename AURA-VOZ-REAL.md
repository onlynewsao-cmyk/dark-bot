# DARK BOT — AURA Voz Real (v7.0)

## O que mudou

O bot agora tem **duas camadas de voz**, separadas e honestas:

| Direcção | Áudio | Como funciona |
|---|---|---|
| **SAÍDA** (a Aura liga) | ✅ **ÁUDIO REAL** (RTP) | `baileys-caller` — pilha WASM VoIP do WhatsApp Web. A Aura **fala** (TTS → Opus → RTP) e **ouve** (RTP → PCM 16 kHz → transcrição → resposta). |
| **ENTRADA** (ligam para ela) | ⚠️ sinalização + notas de voz | Atende o sinal (`ack → receipt → preaccept → accept`), fala logo uma saudação em PTT e conversa por notas de voz. |

## Porque é que ATENDER com áudio real não existe

Isto **não é falta de tentar** — foi auditado e confirmado hoje (14-08-2026):

1. **`@systemzero/baileys`** (a lib do bot) é um cliente de **sinalização por WebSocket**. Não tem pilha de média nenhuma: `rejectCall` existe, `acceptCall`/WebRTC/SRTP **não**. Issue oficial do Baileys sobre chamadas ([#40](https://github.com/WhiskeySockets/Baileys/issues/40)) aberta desde 2023.
2. **`baileys-caller`** (SheIITear) — a solução mais avançada que existe, que embrulha a pilha WASM VoIP **oficial** do WhatsApp Web — declara no próprio README:
   - ✅ Chamadas de voz 1:1 de **saída**
   - ✅ Receber o áudio remoto como `Float32Array`
   - ❌ **Inbound calls** (atender entrada)
   - ❌ Vídeo ❌ Grupo
3. Confirmei no **código-fonte** da lib: o WASM até processa offers de entrada (`handleIncomingSignalingOffer`, estado `ReceivedCall=3`), mas o wrapper **não expõe nenhum método de aceitar** — só `startVoipCall` (saída). Fechar isso = reengenharia do protocolo proprietário da Meta, sem forma de testar contra um WhatsApp real daqui.
4. A única forma de **atender com áudio real** é a **WhatsApp Business Cloud API** (Meta), que é outro produto: número verificado, webhooks, `pre_accept`/`accept` com SDP. Não é compatível com Baileys.

**Resumo:** nenhuma biblioteca Baileys no mundo atende chamadas de entrada com áudio. O que existe — e está agora ligado — é áudio real **de saída** + atendimento por sinalização + conversa por voz (PTT) na entrada.

## Como activar a VOZ REAL de saída

**A partir da v7.0.1 já é dependência normal do projecto** — instala-se sozinha em
cada deploy (o Render descarrega o binário nativo pré-compilado `@roamhq/wrtc-linux-x64`,
sem compilar nada, por isso **não rebenta o build Free**).

```bash
# Só para instalação manual/local (VPS sem deploy automático):
npm run setup:voip
```

Passos no Render:

1. Faz **deploy** do `main` (Manual Deploy → Clear build cache & deploy) — instala tudo sozinho.
2. Abre **Conectar → Voz Real (VoIP)** e escolhe:
   - **QR** → `🎙️ Gerar QR Voz Real` → escaneia em **WhatsApp → Aparelhos conectados → Ligar um aparelho**;
   - **ou Pair Code** → escreve o número (DDI) → `🔐 Pair Code Voz Real` → no WhatsApp:
     **Aparelhos conectados → Vincular com número → digita o código**.
   É o **3.º aparelho** — não toca nas credenciais do bot principal (partilhar creds daria 440).

Depois:
- **`.ligar <numero>`** → a Aura liga, **fala** e **ouve** de verdade. O que ela ouve é transcrito (Groq Whisper → AssemblyAI) e respondido.
- **autoCall** (liga ao Dono ao arrancar e de X em X minutos) passa a usar voz real quando a sessão VoIP existe; sem ela, cai no método anterior (realCall + PTT) como sempre.

### 🔐 Pair Code (como funciona por dentro)
O `baileys-caller` só faz QR. Por isso o emparelhamento por código usa
`@whiskeysockets/baileys` v7 (dependência) directamente: pede o código com
`requestPairingCode()`, guarda as creds em `data/auth-voip` e entrega-as ao
`baileys-caller` — mesma identidade de aparelho, sem re-emparelhar.

### 💾 Sessão persistente no MongoDB
A pasta `data/auth-voip` (creds + chaves) é espelhada no MongoDB
(colecção `whatsapp_sessions`, prefixo `voip:fs:`). Ao arrancar, a sessão é
restaurada a partir do Mongo — por isso **sobrevive a deploys do Render Free**
(disco efémero) como já acontece com o bot principal e o call-bot.
O disco é vigiado (`fs.watch`) e re-gravado sempre que as chaves rodam.

### ⚠️ Render Free: ffmpeg
O `baileys-caller` alimenta o áudio com `ffmpeg` do PATH. O `liveVoip` acrescenta
automaticamente o binário do `ffmpeg-static` (dependência) ao PATH, por isso não
precisas de instalar ffmpeg no servidor.

## Módulos tocados (v7.0)

- `src/bot/liveVoip.js` — reescrito: `conectar()` (QR), `emparelhar(numero)` (pair code), `ligarAoVivo(numero, { saudacao, onEscuta })`, escuta PCM→WAV com detecção de silêncio (`pcmParaWav`, `_criarEscuta`), mirror da sessão no MongoDB (`_salvarNoMongo`/`_restaurarDoMongo` + `fs.watch`), ffmpeg no PATH e degradação graciosa.
- `src/routes/api.js` — endpoints `/api/voip/status`, `/api/voip/start` (QR), `/api/voip/pair` (pair code), `/api/voip/logout`.
- `src/routes/dashboard.js` — `/dashboard/connect` resolve `voipState` (incl. `pairingCode`).
- `src/views/dashboard/connect.ejs` — secção Voz Real com QR **e** Pair Code; corrigidos os botões mortos do call-bot.
- `src/bot/callBridge.js` — `.ligar` com voz real + escuta → transcrição → resposta.
- `src/bot/autoCall.js` — tenta voz real primeiro, cai no realCall se não houver sessão/lib.
- `src/bot/atenderChamada.js` — corrigido bug de precedência no `stanzaId` (handshake de atendimento).
- `scripts/setup-voip.js` — instala o stack opcional (`npm run setup:voip`).
- `scripts/test-aura-voz-real.js` — testes da lógica de voz + pair + persistência (`npm run test:auravozreal`).
- `scripts/test-aura-viva.js` — corrigidos 2 bugs pré-existentes (referência órfã `_ger` que fazia o `npm test` rebentar, e asserção desactualizada que exigia silêncio ao atender).

## Testes

Suite completa: **`npm test` → 0 falhas** (inclui `test:chamadas` 28/28 e o novo `test:auravozreal` 18/18).

## Limites que continuam (honestamente)

- ❌ Atender **entrada** com áudio bidireccional — impossível em Baileys (ver acima).
- ❌ Vídeo e chamadas de grupo — a lib não faz.
- ⚠️ Na 1.ª vez o QR do VoIP sai nos **logs** (o `baileys-caller` imprime no terminal via qrcode-terminal).
- ⚠️ A resposta da Aura durante a chamada de saída sai como **nota de voz (PTT)** no chat — a lib só deixa injectar um ficheiro de áudio no início da chamada, não trocar em plena chamada.

## O que só o WhatsApp real confirma

1. Se o QR do 3.º aparelho liga sem conflitos (440) com o bot principal + call-bot.
2. Qualidade do TTS (ElevenLabs) transportado por Opus.
3. Se a transcrição do que a Aura ouve dispara bem (silêncio ≈ 650 ms).
