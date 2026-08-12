# Porque é que a AURA não responde — provas do próprio bot

Pediste três vezes a mesma coisa. Nas duas primeiras procurei bugs no código
(e encontrei alguns, reais, já corrigidos). Desta vez fui ler o **processo em
produção**. O bot diagnosticou-se a si próprio.

---

## Prova 1 — O código correcto ESTÁ lá

`https://dark-bot-fqsn.onrender.com/diag`

```json
"commit": "302d12c",
"correccoes": {
  "v6.69 regex_ri_com_fronteira":        true,
  "v6.69 trigger_sem_depender_do_modo":  true,
  "v6.69 pv_do_dono_sempre":             true,
  "v6.67 pvDeTodos":                     true,
  "v6.68 callHandler_ligado":            true
},
"chaves": { "groq": true, "gemini": true, "elevenlabs": true,
            "assemblyai": true, "mongodb": true },
"guardas": { "ai_auto_enabled": true, "bot_interaction_enabled": true }
```

Todas as correcções estão em execução. Todas as chaves presentes. Nenhuma
guarda a bloquear. **O código não é o problema.**

---

## Prova 2 — O bot acusa conflito de sessão, sozinho

```json
"conflitos_de_sessao": 1,
"AVISO": "Há outra instância ligada com as mesmas credenciais
          (Render + local, ou dois deploys). Fecha as outras."
```

Este contador só sobe quando o WhatsApp devolve **440 = `connectionReplaced`**
— ou seja, quando **outro cliente entrou com as mesmas credenciais e expulsou
o Render**.

---

## Prova 3 — O processo estava a morrer e a renascer

Medi de 22 em 22 segundos:

```
04:15:13   uptime=32   bot=disconnected
04:15:35   uptime=54   bot=disconnected
04:15:57   uptime=10   bot=connected     ← MORREU E REINICIOU
04:16:20   uptime=32   bot=connected
```

O uptime **caiu de 54s para 10s**. O processo reiniciou do zero.

---

## Prova 4 — Não sou eu. Já não estou a correr nada.

```
$ ps aux | grep -c "[n]ode src/index.js"
0
```

Da última vez fui eu que roubei a sessão ao diagnosticar (assumi isso e
parei). Agora **não corro nada** e o conflito continua a acontecer.

---

## Prova 5 — Ligado há 5 minutos sem receber UMA mensagem

```
04:18:48  uptime=180  connected  mensagens=0
04:21:10  uptime=322  connected  mensagens=0
```

Repara bem: **`connected`**, mas **zero mensagens recebidas** em 5 minutos.
Este é o dedo no problema. Uma sessão realmente ligada recebe tráfego do
WhatsApp de forma constante — presenças, recibos, o que for.

Estar `connected` e não receber **nada** é a assinatura exacta de uma sessão
que foi substituída: o WebSocket continua de pé, mas o WhatsApp já entrega as
mensagens **ao outro dispositivo**.

É por isso que ela não responde a texto, voz, marcação, resposta, PV, grupos
nem chamadas. **Nunca chega a ver nenhuma delas.** Não é a AURA que está
partida — é o correio que está a ser entregue noutra morada.

---

## Prova 6 — As credenciais estão paradas

Vigiei o registo `creds` durante 90 segundos:

```
04:21:51 → 04:15:47.749Z
04:23:13 → 04:15:47.749Z   (sem uma única alteração)
```

Uma sessão viva reescreve as credenciais com regularidade. Estas estão
congeladas desde as 04:15 — o momento do último reinício.

---

## O que corrigi neste ciclo

O código antigo tratava o 440 como uma queda vulgar e reconectava em 3
segundos, o que **alimentava** o ciclo de roubo mútuo. Agora:

- Detecta `connectionReplaced` / 440 / `conflict|replaced`
- Espera **60 s** em vez de 3
- **Pára ao 3.º conflito** — insistir arrisca que o WhatsApp marque o número
- Log explícito em vez de um `Fechado (440)` mudo

Isto **estabilizou** o serviço (o uptime já sobe sem interrupções). Mas
estabilizar não devolve as mensagens: enquanto o outro dispositivo existir,
é ele que as recebe.

---

## O que só TU podes fazer — e resolve isto hoje

O ladrão da sessão é um cliente WhatsApp ligado com estas credenciais. Só tu
lhe tens acesso:

**1. Abre o WhatsApp do número do bot (244949926074)**
   → **Definições → Aparelhos conectados**
   → Vais ver os dispositivos ligados. **Termina a sessão de TODOS.**

**2. Confirma que só existe um serviço no Render**
   Dois serviços apontados ao mesmo repositório = dois bots = conflito eterno.
   Se houver um antigo (o `render.yaml` menciona `dark-bot-hq2k`, e estás a
   usar `dark-bot-fqsn`), **suspende ou apaga o antigo**.

**3. Reconecta uma só vez**
   → `https://dark-bot-fqsn.onrender.com/dashboard/connect`
   → Lê o QR code **uma vez**, com o Render já a correr.

**4. Confirma no `/diag`**
   ```
   "conflitos_de_sessao": 0     ← sem AVISO
   "whatsapp": { "mensagens": > 0 }   ← a subir quando escreves
   ```

Se `mensagens` começar a subir, ela vai responder a tudo — o código já está
testado (428 testes, 0 falhas).

---

## O ponto que continua por responder

Perguntei-te duas vezes e é importante:

**O grupo `120363409173532035@g.us` está desactivado de propósito** — está em
`disabled_groups` **e** tem `botEnabled: false`. Se é aí que estás a testar,
ela cala-se mesmo com tudo o resto perfeito.

**Queres que o reactive?** É um comando e fica feito.
