# DARK BOT — Porque é que a AURA estava muda

Reportaste **duas vezes** que ela não responde a nada: texto, voz, marcação,
resposta directa, PV, grupos, chamadas. E das duas vezes os meus testes
passaram todos. Isso significava que o bug **não estava no código** — estava
no que corre em produção.

Fui ver o processo real do Render em vez de continuar a testar localmente.

## O que encontrei

```
1ª leitura de /status  →  Mensagens: 32 | Comandos: 22 | Uptime: 1210s
   (corri o bot no sandbox para diagnosticar)
2ª leitura de /status  →  Mensagens:  0 | Comandos:  0 | Uptime: 8s
```

O Render foi **derrubado no instante em que arranquei o bot aqui**. E o log
do meu sandbox mostrou:

```
[SUCCESS] ✅ Conectado: 244949926074:79@s.whatsapp.net
```

O mesmo número, a mesma sessão. **Eu roubei-lhe a ligação.**

## A causa: conflito de sessão (código 440)

O auth state vive todo no MongoDB (`useMongoAuthState`). Qualquer processo
com a mesma `MONGODB_URI` liga-se como **o mesmo dispositivo**. O WhatsApp só
aceita um de cada vez: quando o segundo entra, o primeiro cai com
`connectionReplaced` (440).

O código antigo tratava isso como uma queda normal e **reconectava com
backoff de 3s**. Resultado: as duas instâncias ficam a derrubar-se em ciclo.

```
Render conecta  →  local entra  →  Render cai (440)
Render reconecta 3s  →  local cai (440)
local reconecta 3s   →  Render cai (440)   ... para sempre
```

O `/status` mostra **"connected"** — porque tecnicamente está, durante os
poucos segundos entre cada roubo. Mas nunca chega a receber uma mensagem.
Para ti, o sintoma é exactamente este: **"online mas não responde a nada"**.

## O que corrigi

### 1. Detectar o conflito em vez de alimentá-lo

```js
const isConflito = code === DisconnectReason.connectionReplaced ||
                   code === 440 || /conflict|replaced/i.test(reason);
```

- Espera **60 segundos** em vez de 3
- Ao **3.º conflito seguido, PARA** de reconectar — insistir só arrisca que o
  WhatsApp marque o número
- Escreve no log qual é o problema, em vez de um `Fechado (440)` mudo
- Uma ligação normal põe o contador a zero

### 2. Rota `/diag` — para nunca mais adivinhar

`https://dark-bot-fqsn.onrender.com/diag` devolve o que o processo **tem
mesmo em memória**:

```json
{
  "commit": "aa7c4c7",
  "correccoes": {
    "v6.69 regex_ri_com_fronteira": true,
    "v6.69 trigger_sem_depender_do_modo": true,
    "v6.69 pv_do_dono_sempre": true,
    "v6.67 pvDeTodos": true,
    "v6.68 callHandler_ligado": true
  },
  "bot": { "nome": "DARK BOT", "prefixo": ".", "owner": "244945280380" },
  "chaves": { "groq": true, "gemini": true, "elevenlabs": true, "assemblyai": true },
  "whatsapp": { "estado": "connected", "mensagens": 0, "uptime": 1 },
  "guardas": {
    "ai_auto_enabled": true,
    "disabled_groups": ["120363409173532035@g.us"],
    "disabled_users": ["244957875066"]
  },
  "conflitos_de_sessao": 0
}
```

Se houver conflitos, aparece um campo `AVISO`. Se estiver ligado há mais de
5 minutos sem receber **uma única** mensagem, aparece `AVISO_SILENCIO` — é a
assinatura da sessão roubada.

## O que TU tens de fazer (isto não se resolve só com código)

**Garante que existe UMA só instância ligada:**

1. Se tens o bot a correr no PC/telemóvel/outro servidor com o mesmo
   `MONGODB_URI` — **fecha**.
2. No Render, confirma que só há **um** serviço ligado a este repositório
   (dois serviços = dois deploys = conflito permanente).
3. Verifica em **WhatsApp → Aparelhos conectados** se há sessões antigas.
   Remove tudo o que não reconheças e deixa só uma.
4. Reinicia o serviço no Render (**Manual Deploy → Clear build cache & deploy**).
5. Abre `/diag` e confirma: `conflitos_de_sessao: 0` e as mensagens a subir.

**Nota importante:** enquanto eu diagnostico, se correr o bot aqui, derrubo o
Render outra vez. A partir de agora só corro código sem tocar no WhatsApp.

## O grupo desactivado

`120363409173532035@g.us` está em `disabled_groups` — o bot está desligado lá
de propósito. É o mesmo grupo que tem `botEnabled: false`. Se é onde estás a
testar, é normal ela não responder. **Diz se queres que reactive.**

## Testes

`npm run test:sessao` — **19/19**: código 440 reconhecido, contagem de
conflitos, paragem ao 3.º, espera de 60s, reset em ligação normal, e a rota
`/diag` com todos os campos.

Suite completa: **428 testes, 0 falhas**.
