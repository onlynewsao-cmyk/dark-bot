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

```bash
npm run setup:voip     # instala baileys-caller (sem gravar no package.json)
npm start              # na 1.ª vez, o QR do VoIP aparece nos logs
```

Escaneia o QR em **WhatsApp → Aparelhos conectados → Ligar um aparelho** (é o **3.º aparelho** — não toca nas credenciais do bot principal; partilhar creds daria 440).

Depois:
- **`.ligar <numero>`** → a Aura liga, **fala** e **ouve** de verdade. O que ela ouve é transcrito (Groq Whisper → AssemblyAI) e respondido.
- **autoCall** (liga ao Dono ao arrancar e de X em X minutos) passa a usar voz real quando a sessão VoIP existe; sem ela, cai no método anterior (realCall + PTT) como sempre.

### Porque não está nas dependencies obrigatórias
O `baileys-caller` arrasta `@roamhq/wrtc` (módulo **nativo**) + `@whiskeysockets/baileys` (peer). Isso rebenta o build do Render Free. Por isso fica **opcional e isolado** (`data/auth-voip`): se não existir, o módulo devolve `{ ok:false, motivo:'nao_instalado' }` e o resto do bot segue igual.

## Módulos tocados (v7.0)

- `src/bot/liveVoip.js` — reescrito: `conectar()`, `ligarAoVivo(numero, { saudacao, onEscuta })`, escuta PCM→WAV com detecção de silêncio (`pcmParaWav`, `_criarEscuta`), estado e degradação graciosa.
- `src/bot/callBridge.js` — `.ligar` com voz real + escuta → transcrição → resposta.
- `src/bot/autoCall.js` — tenta voz real primeiro, cai no realCall se não houver sessão/lib.
- `src/bot/atenderChamada.js` — corrigido bug de precedência no `stanzaId` (handshake de atendimento).
- `scripts/setup-voip.js` — instala o stack opcional (`npm run setup:voip`).
- `scripts/test-aura-voz-real.js` — testes da lógica de voz (`npm run test:auravozreal`).
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
