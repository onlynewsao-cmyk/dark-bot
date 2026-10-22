# DARK BOT / AURA — correcções locais e validação

**Data:** 18/10/2026 · **Base:** `9cf54d14ab68e9d7e1c5a964ab219c28cab17e1c`\
**Branch local:** `review/workspace-2026-10-18`\
**Estado:** código corrigido no workspace, sem commit, push, activação de contas ou deploy no Northflank.

## 1. O que os prints mostram — e o que foi confirmado no código

O último print mostra três pedidos «Diga oi» às 18:24 e respostas às 18:41: um áudio de seis segundos e dois textos iguais. Os anteriores mostram uma pausa interpretada como ignorar outra pessoa, mudanças de assunto e respostas de limitação cortadas.

**Há histórico no projecto.** Não era correcto concluir que a AURA não tinha memória só porque repetiu uma resposta. Foram encontrados defeitos concretos no uso do contexto, nos caches, na persistência concorrente e na escolha do formato:

| Problema confirmado | Correcção local |
|---|---|
| Cache da IA comparava apenas os primeiros 500 caracteres do pedido e 200 do sistema, sem histórico ou identidade da conversa. | SHA-256 do pedido e sistema completos, histórico efectivo, cargo e escopo explícito por chat/remetente. Chamadas sem escopo não reutilizam respostas de conversas. |
| Cache semântico da persona podia devolver respostas semelhantes de outra conversa. | Removida essa reutilização na persona; o cache contextual do motor mantém-se. |
| Cache de requisição era uma variável global, partilhada por handlers simultâneos. | `AsyncLocalStorage`, deduplicação dentro de cada mensagem e protecção contra leituras antigas que sobrescrevam uma escrita nova. |
| Histórico usava leitura + alteração de documento + `save()`, sujeito a sobrescritas concorrentes. | Acrescentamento atómico com `$push/$slice/$inc` e deduplicação local da criação de contexto. |
| O histórico podia guardar o texto bruto da IA antes de saber se foi enviado. | Observador de envio regista o texto final entregue; uma resposta suprimida não conta como entrega. O texto efectivamente sintetizado é registado quando o envio de voz conclui. |
| «Diga oi» passava por geração desnecessária, com persona e eventual TTS. | Pedido literal reconhecido e respondido directamente: `Oi!`. Em grupos, continuam os gates de participação. |
| O formato de áudio podia ser escolhido aleatoriamente, mesmo sem pedido. | Retirada a escolha aleatória de voz. Pedido explícito, entrada de áudio ou modo de voz deliberadamente configurado continuam disponíveis; pedido de texto prevalece. |
| TTS podia encadear pedidos demorados e um fallback local devolvia WAV como se fosse MP3. | Orçamento total abortável de voz, por defeito 12 s; retirada a falsa conversão. Se falhar, segue texto com explicação. |
| Recusas eram reescritas como piadas e «gozar» podia ser confundido com gozar com terceiros. | Limitações preservadas; sem tentativas de reformular para contornar recusas, sem alvo inventado e sem fallback automático para gozo. |
| O sanitizador cortava frases úteis de limitação, identidade e respostas curtas. | Preserva esses conteúdos e continua a retirar blocos de raciocínio/instrução interna detectados. |

Isto explica mecanismos capazes de produzir os sintomas. **Não é prova de uma causa única para os 17 minutos na instância online:** não foram consultados os logs, o consumo de recursos, o estado do MongoDB, as filas ou os providers reais dessa instância.

## 2. Pausa, atrasos e identidade do Dark

- «Ignore tudo que eu vou fazer a partir de agora», «ignora-me» e formas equivalentes pausam **a pessoa naquele chat**, em vez de pedir uma menção a outra pessoa.
- «Volta a responder» retoma apenas esse escopo. Outro participante ou outro chat não pode levantar a pausa.
- Os controlos de pausa/retoma são tratados antes do semáforo de trabalho, inclusive quando aparecem depois de mensagens demoradas no mesmo lote.
- O estado é guardado em `data/aura-conversation-pauses.json`, com chaves derivadas do chat/remetente, sem guardar o texto do pedido. Esse ficheiro é runtime e está ignorado pelo Git.
- Uma falha de persistência é comunicada; uma falha de retoma não activa silenciosamente a conversa.
- Respostas conversacionais já ultrapassadas por um novo turno, pausadas ou demasiado antigas são suprimidas. A idade usa o timestamp de transporte quando disponível; o padrão é 60 s, não uma garantia universal de latência.
- A pausa não desfaz acções/envios já iniciados. **A moderação de segurança do grupo permanece activa.** Downloads automáticos e reacções conversacionais de novas mensagens pausadas não são disparados por esse caminho.
- Valores inválidos/zero para `ROUTER_MAX_VOO` deixam de bloquear a fila indefinidamente; o semáforo transfere os lugares em FIFO sem duplicar a contagem.
- A identificação do Dark usa os números configurados e LID exacto. Nome de perfil, texto com um número, subdono, administrador ou a conta do bot não bastam para ser o Dono principal.
- A normalização de LID para PN preserva o LID verificado. Eventos `fromMe` distinguem o autor real do destinatário do PV.

## 3. Compreensão de pedidos: cobertura, não uma lista artificial de mil comandos

Nova camada conservadora em `src/aura/auraDialogue.js`:

- normaliza formas como «apague/apaga», «remova/remove», «diga/diz», vocativos e pedidos educados;
- separa perguntas, citações e negações de ordens de execução;
- reconhece pedidos literais de saudação, preferências de formato e pedidos de esclarecimento;
- perguntas curtas como «?», «pq?» e «O quê?» deixam de ser classificadas como simples confirmações para respostas aleatórias;
- acrescenta uma orientação contextual para esclarecer a resposta anterior, em vez de mudar de assunto;
- rejeita o caminho legado de execução directa de `[CMD:]` gerado pela IA; respostas a perguntas/negações/pedidos de texto não autorizam tags de acção por esse caminho. O dispatcher de capacidades e as confirmações existentes continuam a ser usados.

**Corpus reproduzível: 1.423 cenários derivados de modelos de frases:**

| Família | Cenários |
|---|---:|
| Pedidos literais e contra-exemplos | 1.014 |
| Normalização de pedidos | 120 |
| Perguntas, negações e texto citado | 150 |
| Preferências de formato e contra-exemplos | 109 |
| Pedidos de esclarecimento | 30 |

Ficheiro: `scripts/fixtures/aura-language-corpus.json`. Gerador: `scripts/build-aura-language-corpus.js`.

**Estes números não significam 1.423 verbos independentes, novos comandos, conversas humanas avaliadas ou inteligência geral certificada.** São testes linguísticos verificáveis. O modelo real continua a determinar a qualidade de respostas abertas e requer avaliação com os providers usados em produção.

## 4. Outras correcções confirmadas

- Três imports lazy corrigidos: `aura/actions/megaActions`, `bot/cases/pack` e versão do pacote na API. Retirado também um fallback de versão com caminho errado.
- Socket.IO passa a partilhar a sessão HTTP e exige sessão de owner e origem autorizada para receber o feed privado.
- `/api/bot/status` usa allow-list para contas não-owner: não envia QR, pairing code, identificador da conta, logs ou futuros campos secretos.
- `/diag` exige owner. `/test-pv` exige owner **e** activação explícita de debug; fica desligado por defeito.
- Segredos HMAC de webhooks não são devolvidos a uma simples chave de API IG; a leitura desses campos exige sessão owner.
- Produção deixa de aceitar um `SESSION_SECRET` curto, ausente ou placeholder. Desenvolvimento sem segredo forte usa um segredo aleatório por arranque.
- O reset destrutivo de personagens RPG deixa de correr implicitamente no arranque. Exige opt-in de ambiente e confirmação explícita na função. Nenhum jogador real foi apagado nesta tarefa.
- Limpeza de histórico no case alternativo passa a usar o `contextId` real e a verificar permissões, em vez de filtrar por campos inexistentes.
- Requisito Node actualizado para `>=20.19.0`, coerente com dependências instaladas.
- `proxy-addr` actualizado de 2.0.7 para 2.0.8, retirando o alerta crítico identificado. Não foi executado `npm audit fix --force` nem uma troca massiva de versões.

## 5. Validação efectivamente executada

Evidência: [`fixes-2026-10-18/validation-results.json`](fixes-2026-10-18/validation-results.json).

- **23/23 scripts seleccionados passaram:** 14 regressões já existentes, 8 novas suites e o smoke local de módulos.
- **536/536 ficheiros JavaScript analisados sintacticamente.** O fragmento intencional `case-pin-systemzone.js` foi envolvido num `switch` dentro de função async para validação; não foi tratado como um programa autónomo.
- **37/37 templates EJS compilaram.**
- **1.423/1.423 cenários linguísticos passaram.**
- Testes de cache com pedidos de provider simulados e abortos de timeout; sem chamadas a providers reais.
- Testes de 100 acrescentamentos concorrentes ao histórico com armazenamento simulado; sem MongoDB real.
- Teste HTTP/Socket.IO real, mas **apenas num servidor efémero de loopback**, com sessões e dados fictícios.
- Testes de saturação da fila, pausa prioritária, deduplicação, FIFO, capacidade inválida e preservação de moderação.
- `git diff --check` sem erros.

O runner limpa as credenciais do ambiente, desactiva a leitura de `.env` e bloqueia base de dados, processos-filho e rede externa. Alguns scripts antigos tentaram I/O e o guard bloqueou-os; os mecanismos estão registados no JSON. **O guard não é uma sandbox de segurança:** os próprios mocks de teste podem substituir métodos. Estes resultados não certificam binários de média ou operações reais bloqueadas.

Reproduzir as oito suites novas:

```bash
npm run test:fixes
```

Reproduzir o subconjunto completo, syntax e EJS, com guard:

```bash
python3 scripts/run-fixes-validation.py
```

O `npm test` global **não foi executado**: mistura testes de integração, rede, média e funcionalidades que não devem ser activadas indiscriminadamente.

## 6. Aplicação no Northflank — ainda necessária

A instância estar online há dias **não actualiza o código que ela está a executar**. Este workspace não controla o serviço Northflank; não houve publicação remota ou redeploy.

1. Fazer backup do repositório, MongoDB e sessões antes de alterar a instância. Rever/mesclar os ficheiros corrigidos; o pacote corresponde à base indicada no início deste relatório.
2. Preservar as variáveis reais. **Não substituir a configuração existente por `.env.example`** e não partilhar valores de segredos. Confirmar Node 20.19+ e `APP_URL` com a origem HTTPS real do painel.
3. Confirmar que `SESSION_SECRET` é único, aleatório e tem pelo menos 32 caracteres. Se tiver de ser rodado, as sessões do painel podem terminar; isso não é uma instrução para apagar sessões WhatsApp.
4. Manter `ENABLE_DEBUG_ENDPOINTS=false` e `ALLOW_LEGACY_RPG_RESET=false`. Não activar o reset para aplicar estas correcções.
5. Publicar a revisão revista no repositório do serviço e efectuar um novo deploy pelo procedimento habitual. O build local usou lifecycle scripts desactivados; FFmpeg e demais binários de média não foram certificados aqui.
6. Depois do deploy, testar numa conversa autorizada: `Diga oi` → texto curto, `Quem sou eu?` → identidade coerente, pausa/retoma, `O quê?` a uma resposta anterior e um pedido explícito de áudio. Verificar que não surgem respostas antigas em rajada.
7. Confirmar nos logs **sanitizados** a revisão executada, tempos de fila/provider/TTS e disponibilidade do MongoDB. Se os 17 minutos continuarem, esses dados são necessários para distinguir rede WhatsApp, fila, CPU/memória, base de dados e provider. Nunca enviar QR, pairing code, cookies, tokens ou valores de variáveis.

Parâmetros opcionais documentados em `.env.example`:

| Parâmetro | Padrão / efeito |
|---|---|
| `AI_TOTAL_TIMEOUT_MS` | 12 s prioridade / 15 s normal se ausente; máximo 30 s para a cadeia de texto, não para todo o handler. |
| `AI_PROVIDER_TIMEOUT_MS` | 5 s por provider, dentro do orçamento total. |
| `AURA_TTS_TIMEOUT_MS` | 12 s para a cadeia de voz; máximo 20 s. |
| `AURA_REPLY_MAX_AGE_MS` | 60 s de idade máxima de resposta conversacional; máximo 120 s. Não expira indiscriminadamente confirmações de comandos. |
| `ROUTER_MAX_VOO` | 8 mensagens em voo por defeito; máximo 32. |

## 7. Limites e trabalho ainda pendente

- **Não há certificação de «todos os bugs resolvidos».** Não se executaram todos os milhares de aliases/handlers, contas reais, MongoDB real, multimédia nativa, restore de sessões, VoIP, APIs externas ou o serviço Northflank.
- O audit de produção ficou em **18 entradas vulneráveis: 0 críticas, 11 altas e 7 moderadas**. As restantes exigem remediação e testes de compatibilidade dedicados; não foram ignoradas nem declaradas resolvidas. Evidência: [`fixes-2026-10-18/npm-audit-production.json`](fixes-2026-10-18/npm-audit-production.json).
- Permanecem áreas do levantamento anterior que não foram integralmente corrigidas: fetch de URLs/SSRF e limites de buffering, execução dinâmica/eval/auto-instalação de pacotes e funcionalidades com riscos de privacidade.
- O histórico conserva o limite actual de 40 mensagens e a janela usada pela IA é de 16; há TTL de sete dias sem interacção no MongoDB. Não é memória infinita. A persistência requer MongoDB funcional.
- A criação de contexto é deduplicada por processo. Não foi feita migração destrutiva para remover possíveis contextos antigos duplicados nem criado um índice único às cegas. Múltiplas réplicas e duplicados existentes exigem revisão/migração real da base.
- Fallbacks de voz/imagem e nomes de modelos precisam de validação nas contas reais. Não se garante a mesma latência dos testes com mocks.
- Pausa é uma preferência de resposta, não apagamento de histórico, revogação de toda a moderação ou cancelamento retroactivo de acções/envios em curso.
- Não foram procurados nem integrados sites, histórias ou imagens sexualmente explícitos; pedidos de limitação recebem uma resposta coerente, sem contornar salvaguardas.
- A verificação de segurança da própria Arena mostrada num print não é controlada por este repositório.

**Entrega:** código no workspace, oito suites novas, corpus reproduzível e evidências. Nenhuma credencial real foi necessária para os testes e nenhuma alteração foi aplicada à instância online.
