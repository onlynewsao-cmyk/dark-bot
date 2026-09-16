# DARK BOT — revisão do workspace

Data: **16/09/2026** · Versão: **7.72.0**

## 1. Estado confirmado

- Origem: https://github.com/onlynewsao-cmyk/darknet-tunnel
- Pasta: `/home/user/dark-bot`
- Branch: `main`
- Commit importado: `1292c84fd56c2793303f4bffa65241aaa91c58c0`
- Última alteração remota observada: v7.72, cartão automático de prefixo.
- 446 ficheiros versionados na origem; 226 JavaScript em `src/`, 33 templates EJS, 39 módulos JavaScript em `src/aura/`, 44 em `src/bot/cases/` e 20 modelos MongoDB.
- Node local: 20.20.2; npm: 10.8.2.

O repositório foi clonado para um workspace inicialmente vazio. O código de aplicação e o lockfile não foram alterados. Esta revisão acrescenta documentação e uma nota de actualização no contexto histórico. Não houve commit, push, deploy, configuração de credenciais, ligação WhatsApp ou acesso a base de dados de produção.

## 2. O que é o projecto

Apesar do nome remoto `darknet-tunnel`, o pacote chama-se **dark-bot**. É uma aplicação Node.js/CommonJS que reúne:

- **WhatsApp:** Baileys, QR/pair code, mensagens, grupos, cargos, comandos, menus interactivos e sessão persistida.
- **AURA:** conversa contextual, memória, personalidade, humores, interpretação de pedidos, execução de acções autorizadas, voz, visão e proactividade.
- **Dashboard:** Express, EJS, Socket.IO, autenticação, utilizadores, configurações, comandos, pagamentos, grupos, ficheiros e monitorização.
- **Serviços:** downloads, conversão de áudio/vídeo, stickers, jogos, RPG, economia, aluguer de grupos, Instagram/C∆P e análise de configurações de túneis/VPN.

O contexto de conversas anteriores disponível aqui é o que foi registado em `WORKSPACE_CONTEXT.md`, na documentação e nos commits. Isto não equivale a ter acesso a uma transcrição externa da conversa.

## 3. Fluxo actual confirmado no código

```text
src/index.js
  ├─ MongoDB + conta do dono + sessões web
  ├─ Express/EJS + API + Socket.IO
  ├─ WhatsApp singleton / recuperação da sessão
  └─ schedulers, agenda AURA, proactividade, expiração de aluguer

whatsapp.js: messages.upsert
  → messageRouter.process(bot, batch)
    → normalização, ruído, mensagens próprias, humanização
    → messageListener.onUpsert (observação/cache, em paralelo)
    → commandHandler.handle + antiLink/antiSpam/antiTipos/antiFoba
      → prefixos, identidade, configuração, aluguer, permissões
      → sem comando: percepção/contexto/decisão AURA → conversa ou acção
      → com comando: overrides/gates → cases → pacotes/nativos/DB
      → envio de texto/mídia + contadores/eventos
```

**Distinção importante:** o listener não antecede o router como uma etapa linear; o router chama o listener e executa o handler e algumas protecções em paralelo. Uma protecção não é necessariamente uma barreira que termina antes de qualquer comando.

O router limita a concorrência global a 8 mensagens por defeito. Dentro de cada lote mantém ordem por chat e paraleliza chats distintos; isto não demonstra ordenação global entre lotes separados.

## 4. Mapa para próximas alterações

| Área | Ficheiros principais |
|---|---|
| Arranque e configuração | `src/index.js`, `src/config.js`, `.env.example`, `Dockerfile` |
| Conexão/sessão WhatsApp | `src/bot/whatsapp.js`, `mongoAuthState.js`, `usync.js` |
| Entrada e despacho | `messageRouter.js`, `messageListener.js`, `commandHandler.js` |
| Prefixos/cartão | `prefixEngine.js`, `prefixManager.js`, `prefixCard.js` |
| Identidade/permissões | `roleResolver.js`, `userManager.js`, gates em `commandHandler.js` |
| Comandos | `caseHandler.js`, `cases/`, `nativeCommands.js`, `packages/` |
| Menus/categorias | `submenuData.js`, `menuBuilder.js`, `menuThemes.js`, `modeGate.js`, `cases/setmenu.js` |
| IA/providers | `src/bot/ai.js`, `aiSanitizer.js` |
| AURA — decisão/contexto | `src/aura/auraDecide.js`, `auraBrain.js`, `auraCerebro.js`, `auraMemory.js`, `auraHistorico.js`, `auraLinhaTempo.js` |
| AURA — execução/voz | `auraExec.js`, `auraActions.js`, `auraCommands.js`, `auraUniversal.js`, `auraFala.js`, `auraMedia.js`, `auraVoz.js` |
| AURA — comportamento | `auraVontade.js`, `auraHuman.js`, `auraModes.js`, `auraProativa.js`, `rulesEngine.js` |
| Aluguer/pagamentos | `cases/rental2.js`, `cases/premium.js`, modelos `Payment`, `GroupSettings`, `User` |
| Downloads/mídia | `systemZeroPlay.js`, `downloader.js`, `dl/`, `mediaHandler.js`, `compressor.js`, `sticker*.js` |
| Jogos/RPG/economia | `src/bot/rpg/`, `packages/`, `cases/rpg*.js`, modelos associados |
| Dashboard/API | `src/routes/`, `src/middleware/auth.js`, `src/views/`, `src/public/` |
| C∆P / Decrypter | `src/cap/`, `src/decrypter/` |

Caminhos abreviados na tabela são relativos a `src/bot/`, excepto quando indicado.

## 5. Comportamento recente a preservar

- **v7.72 — prefixo:** a palavra isolada `prefixo`/`prefixos`, com variações de caixa e pontuação, produz cartão com opção de copiar. Não é um detector de qualquer frase contendo a palavra. O hook antecede o gate de aluguer; o comando explícito usa o mesmo cartão.
- **v7.71 — AURA viva:** considera grupos não adormecidos com actividade recente e o privado do dono. Humor, horário, limites e nível `calma|normal|viva` condicionam a iniciativa. Não significa falar continuamente em todos os grupos.
- **v7.70 — atendimento privado:** cliente não-dono no PV não é silenciado pela vontade ou pelo marcador `[SILENCIO]` abaixo do limiar de saturação 0,9. Não generalizar esta regra ao dono nem remover protecções anti-abuso.
- **v7.67–7.69 — aluguer:** planos, trial de 7 dias, pedido `DARK-N`, cartão de fatura, dados Multicaixa/Pix, comprovativo, aviso ao dono, activação manual e watcher de expiração com avisos 3d/1d. O cartão de fatura não confirma pagamento bancário. Preços iniciais são placeholders configuráveis.
- **v7.61–7.62 — categorias:** há modos por grupo; downloads e categorias nucleares estão isentos desse filtro específico. Isto não os isenta de aluguer ou outras permissões.
- **v7.64–7.66 — mídia/IA:** menu persistido no MongoDB; integração web/Tavily e transcrição com fallbacks; routing de downloads revisto. Disponibilidade real dos providers precisa de testes externos.
- **Incoming cases:** os 19 snippets já foram integrados na v7.47. Os `.txt` são referência histórica, não módulos carregados directamente.
- **Chamadas:** arranque actual usa o socket principal; manter chamadas automáticas desligadas e validar compatibilidade/risco de restrição da conta antes de testes reais.

## 6. Validação executada nesta revisão

Instalação: `npm ci --ignore-scripts --no-fund`, 614 pacotes instalados. Scripts de instalação foram intencionalmente desactivados; não equivale a validar todos os binários nativos do deploy.

| Verificação | Resultado |
|---|---|
| `test:syntax` | 226 ficheiros, sem erros |
| `test:ejs` | 33 templates, tags equilibradas |
| Compilação adicional `ejs.compile` | 33 templates compilados; sem renderização com dados reais |
| `test:commands` | catálogo auditado de 246 entradas, aprovado |
| `test:roles` | 12 OK / 0 falhas |
| `test:auramodes` | 28 OK / 0 falhas |
| `test:prefixoauto` | 20 OK / 0 falhas |
| `test:smoke` | 17 módulos carregados / 0 falhas |
| `test:planos` | 28 OK / 0 falhas |
| `test:casehandler` | ambos os scripts concluíram com código 0 |
| `test:auraproativa` | 33 OK / 0 falhas |
| `test:incoming` | 76 OK / 0 falhas |

Foram executados **11 scripts npm seleccionados**, não o `npm test` completo (89 etapas no encadeamento actual). A suite usa mocks em vários caminhos; o teste `test-addcase-pin`, incluído em `test:casehandler`, também consultou fonte externa de mídia com fallback. Não houve envio real ao WhatsApp.

O carregador relatou 1995 cases e 929 fontes extraídas durante `test:planos`; estes números incluem registos/aliases e não equivalem a 1995 funcionalidades independentes. As 246 entradas da auditoria pertencem a outro catálogo.

Logs desta sessão: `/home/user/revisao-dark-bot/`.

## 7. Riscos e limites

1. **Dependências:** instalação reportou 13 vulnerabilidades no total (4 moderadas, 9 altas). `npm audit --omit=dev` reportou **12 em produção: 4 moderadas e 8 altas**, sem críticas. Inclui cadeias de Express, sharp, wa-sticker-formatter e yt-search. Não foi aplicado `npm audit fix --force`.
2. **Superfícies web:** em `src/index.js`, `/diag` e `/test-pv` estão registados sem middleware de autenticação; Socket.IO aceita origem `*` e não apresenta integração de autorização de sessão no bootstrap. Rever exposição de diagnósticos/eventos antes de publicar. É uma observação estática, não um teste de exploração.
3. **Código dinâmico:** `caseHandler` permite compilar cases e instalar dependências. Preservar restrição ao dono; validação textual de código não substitui isolamento de execução.
4. **Identidade:** WhatsApp mistura PN/LID. Reutilizar os resolvers existentes e preservar reconhecimento do número do bot como subdono, evitando comparações improvisadas.
5. **Segredos:** configurar fora do Git; não utilizar o secret de exemplo em produção. Nenhuma credencial real foi fornecida/configurada nesta sessão.
6. **Operação:** MongoDB obrigatório em produção, uma única instância WhatsApp e autoscaling horizontal desligado. Validar FFmpeg, yt-dlp e dependências nativas no ambiente final. O Dockerfile assume uma caixa compatível com heap de 1536 MB; não adoptar esse limite numa instância de 1 GB sem rever recursos.
7. **Documentação antiga:** `WORKSPACE_CONTEXT.md`, `REPO_AUDIT.md` e `docs/ARCHITECTURE.md` contêm fotografias de versões anteriores. Números, caminhos e afirmações históricas não prevalecem sobre esta revisão e o código actual.

## 8. Continuidade

A base local está pronta para tarefas de desenvolvimento. Antes de cada mudança: localizar o fluxo real, reproduzir com teste isolado, alterar o mínimo necessário e executar os testes da área. Actualizações de serviços, credenciais, pagamentos e sessão WhatsApp devem ser validadas separadamente em ambiente de teste.

Esta análise estabelece o mapa funcional, o histórico disponível e uma linha de base verificada; não certifica cada comando, endpoint ou integração em produção.
