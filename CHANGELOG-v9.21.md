# CHANGELOG v9.21 — Dark Bot

## 🆕 Novos Comandos — Conversão View-Once

### `!revelar` / `!salvarviewonce` / `!verviewonce` / `!unviewonce` / `!reveal`
Converte uma mensagem de **visualização única** (citada) em mídia **normal/visível**.
- Responde a uma mensagem com o ícone 👁️ e usa o comando
- A mídia é reenviada como mensagem normal — pode ser guardada, encaminhada, etc.
- Suporta imagens, vídeos e áudio

### `!toviewonce` / `!fotinha` / `!viewonce` / `!sohvisualizar` / `!tofo`
Converte uma imagem ou vídeo (citado ou anexado) em **visualização única**.
- Responde a uma foto/vídeo com o comando
- Ou envia a mídia com a legenda `!toviewonce`
- O destinatário só consegue abrir 1 vez

### `!listviewonce` / `!verviewonces` / `!historicoviewonce`
Lista as mensagens de visualização única recentes guardadas pela AURA no chat.

---

## 🔧 Correcções de Estabilidade

### 1. Backpressure na fila de mensagens (`src/bot/messageRouter.js`)
- **Problema:** Fila ilimitada → memory leak e mensagens antigas presas
- **Fix:** Limite máximo de 50 mensagens em fila, TTL de 2 minutos por entrada
- **Métrica:** `queueStats()` exposto no endpoint `/health`
- **Env var:** `ROUTER_MAX_FILA` e `ROUTER_FILA_TTL_MS` para ajustar

### 2. LRU Cache para todos os caches em memória (`src/bot/lruCache.js`)
- **Problema:** Maps ilimitados → crescimento gradual de memória
- **Fix:** Novo módulo `LRUCache` com:
  - Limite máximo de entradas (LRU eviction)
  - TTL por entrada
  - Varredura periódica automática (sweep)
  - Estatísticas (hit/miss/evict)
- **Aplicado em:**
  - `auraModes._cache` → maxSize=2000, TTL=5min
  - `commandHandler._msgCount` → maxSize=3000, TTL=30min
  - `commandHandler._auraReplySeen` → maxSize=2000, TTL=10min
  - `auraTalk._fala` → maxSize=5000, TTL=3min

### 3. `uncaughtException` agora reinicia o processo (`src/index.js`)
- **Problema:** Processo ficava vivo mas inconsistente (zombie)
- **Fix:** Após `uncaughtException`, agenda `exit(1)` em 5s para o supervisor reiniciar
- **Protecção:** Flag `_uncaughtExitScheduled` evita múltiplos exits

### 4. Watchdog detecta conexão pendurada (`src/bot/whatsapp.js`)
- **Problema:** Socket preso em `connecting` sem emitir QR/close
- **Fix:** Vigia agora monitora tempo em `connecting` > 90s e força reconexão
- **Tracking:** `_connectingSince` resetado quando sai do estado

### 5. Queue stats no `/health` (`src/index.js`)
- **Endpoint /health agora inclui:**
  - `queue.voando` — mensagens a processar
  - `queue.maxVoo` — máximo paralelo (8 default)
  - `queue.fila` — mensagens em espera
  - `queue.maxFila` — limite da fila (50 default)
  - `queue.drops` — mensagens descartadas (backpressure)

---

## 📁 Novos Ficheiros

| Ficheiro | Função |
|---|---|
| `src/bot/cases/viewonceConvert.js` | Cases de conversão view-once ↔ normal |
| `src/bot/lruCache.js` | Cache LRU genérico com TTL e sweep |
| `scripts/test-viewonce-convert.js` | Testes (5 suites, 100% pass) |

---

## 📊 Resultados dos Testes

```
✅ LRU Cache: todos os testes passaram
✅ ViewOnce Convert: 13 aliases registados correctamente
✅ ViewOnce unwrap: estruturas de mensagem válidas
✅ Queue stats: estrutura correcta (maxVoo=8, maxFila=50)
✅ AuraTalk LRU: funciona correctamente

Resultados: 5 passaram, 0 falharam

334 arquivos verificados — sem erros de sintaxe
2462 cases carregados (↑ de 1944 — 518 novos aliases)
31/31 testes aura modes
19/19 testes aura viva
```

---

## ⚙️ Novas Variáveis de Ambiente (opcionais)

| Variável | Default | Descrição |
|---|---|---|
| `ROUTER_MAX_FILA` | 50 | Máximo de mensagens em fila no router |
| `ROUTER_FILA_TTL_MS` | 120000 | TTL de cada mensagem na fila (ms) |

---

## 🔍 Como Usar os Novos Comandos

### Revelar uma view-once:
1. Alguém envia uma foto/vídeo de visualização única (👁️)
2. Responde a essa mensagem com `!revelar`
3. O bot reenvia a mesma mídia como mensagem normal

### Converter para view-once:
1. Envia ou responde a uma foto/vídeo
2. Usa `!toviewonce` ou `!fotinha`
3. O bot reenvia como visualização única (abre 1×)

### Ver histórico de view-once:
- `!listviewonce` mostra as últimas 10 view-once guardadas no chat
