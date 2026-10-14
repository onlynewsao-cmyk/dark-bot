# Revisão da AURA e da estabilidade — DARK BOT

**Data:** 14/10/2026
**Checkout:** `main` · `b43da6ab23f7c1820614bfc58ded181b21756cc8`
**Âmbito:** revisão estática de `src/aura/`, `commandHandler.js`, `ai.js`, `messageRouter.js`, `whatsapp.js`, `sessionCenter.js`, `index.js` e ligação MongoDB.

> Esta revisão analisa o código local. Não tive acesso aos logs/telemetria do serviço em produção, às chaves dos providers de IA, ao WhatsApp nem ao MongoDB; por isso não confirma quantas quedas reais ocorreram nem a causa de uma queda específica. Não foi feito pentest ou deploy.
>
> **Actualização da revisão (14/10/2026):** as correcções escolhidas estão agora implementadas localmente na branch `fix/aura-stability-2026-10`, ainda sem commit/push. A cadeia de IA tem orçamento total de 30 s (prioritário) / 45 s (normal), cancelamento dos pedidos e limpeza dos timers; o socket WhatsApp tem timeout de arranque/reconexão e os timers de espera são limpos; as três capacidades marcadas `destrutivo` exigem `CONFIRMAR`/`CANCELAR` do mesmo Dono e chat. Ver “Validação da branch de revisão” e “Estado das alterações e push” no fim. Os riscos de fila sem limite, caches/maps, modos, bootstrap, health e supervisão continuam por tratar.

## Resumo executivo

A AURA tem uma arquitectura funcionalmente ampla — modos por grupo, detecção de intenções, permissões, memória, contexto e execução de comandos — e vários testes isolados passam. **Não é possível concluir que “está tudo correcto” só com esses testes**: os testes não fazem uma conversa end-to-end com WhatsApp, MongoDB e providers reais.

Na fotografia-base da revisão, havia duas causas de código plausíveis para a experiência de “parece parada, demora e depois volta”:

1. A cadeia de providers de IA podia esperar até **~120 segundos** numa chamada prioritária ou **~176 segundos** numa chamada normal se todos os oito providers configurados ficassem pendurados; perguntas que pediam informação actual podiam acrescentar até cerca de 5 segundos. Algumas rotas da AURA fazem mais de uma chamada de IA na mesma mensagem. **O orçamento/cancelamento desta cadeia está agora corrigido localmente na branch de revisão.**
2. O router limita o trabalho activo a 8 mensagens, mas a fila FIFO não tem limite. Se respostas lentas se acumularem, mensagens novas podem ficar atrás de trabalho antigo. **Este risco continua por tratar.**

A fotografia-base também não tinha deadline global para um socket preso em `connecting`; o watchdog só actuava depois de conectado. **O timeout está agora implementado localmente**, mas não foi validado com WhatsApp real. Nenhum destes achados prova a causa de um incidente de produção sem logs com timestamps e códigos de fecho.

## AURA — achados

### A1. Latência e trabalho de IA não cancelado — prioridade alta

`src/bot/ai.js:79-80, 615-693` implementa `withTimeout()` com `Promise.race` e tenta, em sequência, Groq, DeepSeek, Gemini, Hugging Face, Cerebras, ApiFreeLLM, OpenRouter e OpenAI. O limite por provider é 15 s quando `isPriority` está activo e 22 s nos restantes casos. Se os oito providers estiverem configurados e expirarem, o tempo aguardado pode aproximar-se de 8 × esse limite. A obtenção de contexto web tem também um limite exterior de 5 s.

O timeout exterior **não aborta** o pedido HTTP que já começou. O provider anterior pode continuar em segundo plano enquanto o próximo é tentado. `withTimeout()` também não limpa o timer quando a operação termina cedo. O circuit breaker reduz tentativas seguintes depois de uma falha, mas o estado é apenas memória do processo e recomeça vazio após restart.

**Efeito provável:** AURA lenta ou respostas fora de ordem em degradação dos providers; com carga, pedidos pendurados podem consumir sockets e atrasar ainda mais mensagens.
**Recomendação inicial:** definir um orçamento total por resposta (por exemplo, 30–45 s), abortar requests com `AbortController`, impor tempos por provider menores, registar duração/provider e evitar chamar o router de intenção e depois a resposta completa quando a primeira já esgotou o orçamento.

**Implementado na branch de revisão:** orçamento total de 30 s para prioridade e 45 s para o restante, incluindo pesquisa web; limites por tentativa de 8/10 s; `AbortSignal` propagado por providers e contexto web; timers limpos quando a operação termina; abort ao expirar para impedir pedidos antigos de continuarem enquanto o fallback corre. A instrumentação de latência/provider e o orçamento partilhado entre chamadas de IA separadas da mesma mensagem continuam fora desta alteração.

### A2. Fila de mensagens sem backpressure — prioridade alta

`src/bot/messageRouter.js` permite até `ROUTER_MAX_VOO` mensagens simultâneas (8 por defeito). Quando o limite é atingido, `_adquirir()` acrescenta uma Promise a `_fila`, sem máximo, expiração ou descarte de mensagens antigas. A resposta da AURA pode ficar presa atrás de mensagens lentas, em especial quando a cadeia da IA está a fazer fallback.

**Recomendação:** limitar a fila, medir idade/profundidade e rejeitar ou descartar mensagens antigas com critério explícito; manter a ordem por chat sem permitir crescimento ilimitado. Validar também `ROUTER_MAX_VOO` (um valor não numérico ou zero pode impedir a aquisição de vagas).

### A3. Acções marcadas como destrutivas não pedem confirmação — prioridade alta

`src/aura/auraBrain.js:112-116` documenta que `risco: 'destrutivo'` pede confirmação e marca, por exemplo, `canal_apagar`, `sair_grupo` e `limpar_chat` (`:388-390, :504-506, :565-571`). Porém, `podeFazer()` verifica cargo e não consulta `risco` (`:690-694`), e o caminho de execução em `src/bot/commandHandler.js:2821-2827` chama `auraExec.executar()` directamente. Os respectivos cases em `auraExec.js` executam a acção sem uma confirmação adicional visível.

Estas capacidades estão limitadas ao Dono, mas uma classificação errada da frase continua a poder disparar uma acção irreversível. O teste actual verifica que a etiqueta “destrutivo” existe, não que a confirmação seja exigida.

**Recomendação inicial:** confirmação explícita, com expiração e vínculo à acção/chat, antes de qualquer capacidade destrutiva; criar testes que provem que a execução não acontece antes da confirmação.

**Implementado na branch de revisão:** pendência de 60 s por remetente/chat; só a palavra exacta `CONFIRMAR` executa, `CANCELAR` aborta; permissão revalidada no momento da confirmação; a execução directa em `auraExec` recusa acções destrutivas sem o sinal interno de confirmação. A lista cobre `canal_apagar`, `sair_grupo` e `limpar_chat`.

### A4. Crescimento de caches ao longo de uptime — prioridade média

- `src/aura/auraModes.js:30-35, 50-92`: `_cache` é um `Map` sem limite máximo ou varredura periódica. O TTL só é verificado quando a mesma conversa volta a ser consultada; entradas expiradas de grupos inactivos ficam no mapa.
- `src/bot/commandHandler.js:327-341`: `_msgCount` mantém uma entrada por chat e `_resetMsgs()` apenas a põe a zero; não remove a chave.
- `src/aura/auraTalk.js:8-32`: `_fala` acumula pares chat/utilizador. Existe `limparExpirados()`, mas não encontrei chamada a essa função no repositório.
- `groupMetaCache` de `commandHandler.js` actualiza entradas consultadas, mas não tem varredura global das entradas de chats que deixaram de ser usados.

**Efeito provável:** crescimento gradual de memória em instalações com muitos grupos/utilizadores ou uptime longo; a magnitude depende do tráfego e da cardinalidade real.
**Recomendação:** limites LRU/TTL com limpeza periódica e um teste de stress que confirme um tecto para cada mapa.

### A5. Modo e fallback têm comportamento diferente dos comentários — prioridade média

`src/aura/auraModes.js` ainda contém comentários antigos a dizer que um grupo novo começa no modo Assistente; o código actual começa em `MODE_AURA` e os testes (`test-aura-modes.js`) confirmam que a AURA fica acordada por defeito. Isto pode ser intencional (o código indica uma mudança posterior), mas a documentação do próprio módulo está contraditória.

Além disso, `getMode()` começa com `MODE_AURA` e transforma falhas da query Mongo em `null` (`.catch(() => null)`). Se uma conversa estiver em `MODE_SLEEP` mas a consulta falhar depois de o cache expirar, o modo volta a AURA, em vez de preservar o estado conhecido. Isso pode fazer a AURA responder quando deveria estar a dormir durante uma falha da base.

**Recomendação:** decidir e documentar um único modo padrão; distinguir “não existe registo” de “a consulta falhou” e, em erro transitório, usar o último valor conhecido sem abrir o modo.

## Estabilidade WhatsApp e serviço

### S1. Socket preso em `connecting` sem timeout geral — prioridade alta

`src/bot/whatsapp.js:224-240` executa o watchdog a cada 30 s, mas só actua se o estado for `connected` e o WebSocket estiver fechado. Não há um timeout de saúde equivalente enquanto o estado está `connecting` (o timeout de abertura de 30 s é usado no fluxo pair; não cobre o arranque QR normal). Se a biblioteca não emitir `connection.update: close` e o socket não abrir, não vejo um caminho garantido para voltar a tentar.

**Recomendação inicial:** deadline de conexão/handshake para QR e reconexão normal; no timeout, fechar o socket, limpar listeners/timers e agendar exactamente uma nova tentativa. Testar estados `connecting` pendurado, `close` duplicado e `open` tardio.

**Implementado na branch de revisão:** deadline de 60 s para arranque QR/reconexão e 90 s para início por pair code; ao expirar, socket/listeners são fechados e é agendada uma tentativa com backoff. `open`, `close`, QR e os fluxos de logout/erro limpam o deadline. O race de espera do WebSocket, pedido de pair code e resolução da versão WA também limpa o timer ao terminar. Não foi possível testar com Baileys/WhatsApp real neste checkout.

### S2. Failover de sessão pode ser cedo para uma falha transitória — prioridade média/alta

O backoff normal é `[4, 8, 15, 30, 45]` segundos (`whatsapp.js:70-73`). Após cinco eventos `close` sem um `open`, o handler chama `sessionCenter.falhou()` (`:520-557`); esse caminho marca a principal como morta e tenta promover uma sessão guardada. Cinco fechos rápidos podem acontecer depois dos quatro primeiros intervalos de backoff, portanto a troca pode começar relativamente cedo se a causa for uma indisponibilidade temporária de rede/provider/WhatsApp.

Os códigos especiais têm tratamento próprio: 440 espera 60 s e pára após três conflitos; 403 espera 15 min; 401/logged-out limpa a sessão se não houver failover e exige novo emparelhamento. Esses casos **não são equivalentes** a uma queda simples e devem ser diagnosticados pelo código de fecho.

**Recomendação:** exigir tempo mínimo de falha ou mais sinais antes de trocar para outra conta; separar “conexão indisponível” de “credenciais mortas”; mostrar claramente no painel se houve failover e qual sessão ficou activa.

### S3. Arranque automático faz um número finito de tentativas — prioridade média

`src/index.js:472-526` tenta ler `Session(fileName='creds')` e repete até três vezes, com esperas de 3, 6 e 12 s. Se a leitura do Mongo falhar temporariamente durante o cold start, o bootstrap termina essa rotina sem um retry contínuo; o dashboard pode continuar no ar com o bot desconectado até acção manual ou novo restart.

**Recomendação:** retry limitado com backoff e tecto enquanto houver credenciais e o processo estiver saudável; expor o estado “não foi possível ler a sessão” e permitir restart controlado.

### S4. Excepções não fatais podem deixar o processo vivo, mas degradado — prioridade alta

`src/index.js:619-626` regista `unhandledRejection` e `uncaughtException`, mas não encerra/reinicia o processo. Continuar após uma `uncaughtException` pode deixar estado interno inconsistente: Express/health continuam activos enquanto WhatsApp ou AURA já não processam correctamente.

**Recomendação:** rejeições esperadas devem ser tratadas no ponto de origem; para `uncaughtException`, registar, executar shutdown curto e sair com código não-zero para o supervisor reiniciar. Confirmar que o supervisor está configurado para restart e evitar loops de crash.

### S5. `/health` é sempre sucesso, mesmo se o bot estiver desligado — prioridade média

`src/index.js:204-218` devolve HTTP 200 e `status: 'ok'` independentemente de `botStatus.status` ou do estado da BD; inclui os campos `bot` e `db`, mas monitores que só verificam HTTP 200 não vão alertar para queda WhatsApp/Mongo.

**Recomendação:** manter um endpoint de liveness para o processo e criar readiness/alerta separado que reporte estado WhatsApp, Mongo e idade da última mensagem. Não usar readiness como liveness sem uma política de restart deliberada.

## Validação da revisão estática inicial

Testes locais isolados da AURA, sem rede real:

| Script | Resultado |
|---|---:|
| `scripts/test-aura-brain.js` | 21 OK / 0 falhas |
| `scripts/test-aura-delivery.js` | 14 OK / 0 falhas |
| `scripts/test-aura-modes.js` | 28 OK / 0 falhas |
| `scripts/test-aura-comandos.js` | 22 OK / 0 falhas |
| `scripts/test-aura-vontade-cerebro.js` | 39 OK / 0 falhas |
| `scripts/test-aura-assunto.js` | 5 OK / 0 falhas |
| **Total** | **129 OK / 0 falhas** |

`test-aura-contextual.js` não arrancou porque `dotenv` não está instalado no checkout. Não instalei dependências e não executei o `npm test` completo: o checkout não tem `node_modules`, e o script global inclui testes identificados como “real/live” ou que podem usar rede. As validações estáticas gerais previamente executadas neste checkout continuam registadas em `docs/PROJECT_GUIDE_PT.md`.

## Validação da branch de revisão

- `node --check` passou nos oito ficheiros de aplicação alterados e nos três novos scripts de teste.
- `scripts/test-aura-brain.js`: 21 OK / 0 falhas; `scripts/test-aura-vontade-cerebro.js`: 39 OK / 0 falhas.
- `scripts/test-ai-timeout.js`: 3 verificações passaram; comprova timeout com abort, sucesso sem abort tardio e propagação de erro do provider.
- `scripts/test-wa-timeout.js`: teste isolado do helper de timeout passou.
- `scripts/test-aura-confirmation.js`: passou; confirmação exacta vinculada a remetente/chat, rejeição de “sim”, cancelamento e bloqueio no executor de chamadas directas sem confirmação.
- `git diff --check`: sem erros.
- Não foram executados `npm ci`, `npm test` completo, provider/WhatsApp/MongoDB reais ou deploy. Os oito scripts de teste que já estavam modificados localmente continuam fora da selecção.

## O que falta para confirmar uma queda real

Para distinguir falha de IA lenta, queda de WebSocket, conflito de sessão 440, restrição 403, sessão expirada 401, restart do processo ou problema Mongo, são necessários logs do serviço com timestamps cobrindo uma ocorrência. Partilhar apenas os trechos relevantes e ocultar tokens, cookies, QR/pair-code, números completos e conteúdo de mensagens. O payload de `/health` pode ajudar, mas o endpoint actual não substitui os logs.

## Estado das alterações e push

As correcções estão na branch de revisão `fix/aura-stability-2026-10`, baseada em `b43da6ab23f7c1820614bfc58ded181b21756cc8`:

- IA: orçamento total, cancelamento dos requests e limpeza dos timers.
- WhatsApp: timeout de ligação, limpeza de timers em conclusão e retry com backoff.
- AURA: confirmação exacta e temporária para `canal_apagar`, `sair_grupo` e `limpar_chat`, com bloqueio adicional no executor.
- O teste completo, serviços reais e deploy ainda não foram feitos. As oito alterações locais de modo nos scripts de teste ficam fora do commit.
- Neste ponto não há commit ou push. `git remote -v` não devolve remoto nesta cópia; a credencial fornecida não foi impressa nem copiada para os ficheiros do projecto.

Continuam por tratar, entre outros, A2 (backpressure da fila), A4 (limites/limpeza de mapas), A5 (modo durante falha Mongo), S2 (failover após fechos), S3 (retry do cold start), S4 (política de crash) e S5 (readiness). Atribuir a causa de incidentes reais ainda exige logs de produção.
