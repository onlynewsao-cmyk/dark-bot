# AURA — segunda ronda de melhorias

**Data:** 18/10/2026\
**Base do repositório:** `9cf54d14ab68e9d7e1c5a964ab219c28cab17e1c`\
**Branch local:** `review/workspace-2026-10-18`\
**Estado:** alterações locais implementadas e validadas offline. **Sem commit, push ou deploy no Northflank.**

Esta ronda complementa as [correcções anteriores](AURA_FIXES_2026-10-18.md). O novo pacote `DARK_BOT_AURA_IMPROVED_2026-10-18.zip` é cumulativo: inclui os ficheiros corrigidos das duas rondas, não o repositório completo. O relatório, as evidências e o ZIP da primeira ronda foram preservados como registo histórico.

## 1. Melhor contexto, sem inventar referências

- As duas personas passam ao motor de IA o texto realmente citado, também no privado. Não dependem apenas do nome do grupo ou de uma etiqueta de resposta.
- «O quê?», «porquê?», «pq?», «continua» e pedidos de reformulação são classificados como seguimentos da conversa. A orientação dá prioridade à mensagem citada e, depois, ao histórico disponível.
- Se não houver referência textual nem uma resposta anterior utilizável, a AURA responde localmente: **«A que resposta ou assunto te referes? Responde à mensagem ou diz-me a parte que queres que explique.»** Não faz uma chamada de IA só para inventar o assunto.
- Uma correcção que já contenha uma nova pergunta, como «Não era isso; quero saber como funciona o cache», não é descartada como falta de contexto. Uma pergunta geral sobre bots repetirem respostas também não é confundida com um seguimento vazio.
- A janela enviada ao modelo é filtrada para papéis `user`/`assistant`, limitada às últimas 16 mensagens, com até 1.000 caracteres por mensagem. A citação tem limite de 1.600 caracteres. Estes limites não alteram o histórico já guardado.
- Uma citação de áudio/imagem sem texto é identificada como tal; esta camada não inventa uma transcrição ou descrição visual.

**Segurança:** citações e histórico são conteúdo a analisar, não instruções de sistema nem prova de que alguém é o Dark. A autoria/cargo alegados dentro da citação não atribuem permissões. Perguntas de seguimento e pedidos com citação não disparam automaticamente pesquisa web. Um «continua» ou «pq?» também não autoriza tags de acção produzidas pelo modelo.

## 2. Cancelar trabalho ultrapassado, não apenas esconder o resultado

Antes, suprimir uma resposta antiga não bastava para libertar o lugar que o pedido ocupava na fila. Agora:

1. A chegada de uma mensagem é registada antes da espera pelo semáforo. O lote inteiro é registado antes de ceder execução, evitando que o resto de um lote antigo sobrescreva a ordem de um lote mais recente.
2. Uma nova mensagem do mesmo remetente/chat cancela o trabalho **conversacional** anterior. Pausa/retoma continuam prioritárias.
3. O sinal de cancelamento segue pelas duas personas, pedidos de texto e pelos três caminhos de TTS do handler. A espera termina mesmo quando uma implementação simulada ignora o sinal.
4. Uma mensagem antiga que só depois alcance a fila não pode cancelar o turno mais recente. IDs, timestamps e metadados limitados em memória ajudam a distinguir esses casos.
5. Cancelamento esperado não provoca nova cadeia de providers, resposta de indisponibilidade, cache de resultado cancelado ou penalização de saúde do provider.

O escopo continua a ser **chat + remetente**: outra pessoa ou outro chat não cancela a conversa. Comandos e moderação já iniciados não são indiscriminadamente abortados. Cancelar não desfaz acções executadas nem mensagens cujo envio já começou. Caminhos de visão, download e média fora desta cadeia não ficaram todos canceláveis.

## 3. Resposta mais focada e voz mais coerente

- As instruções construídas para o modelo priorizam a pergunta actual e evitam substituir a resposta por apelidos, afecto genérico, emojis ou frases de enchimento.
- Pedidos técnicos recebem orientação directa e técnica. Preferências explícitas como «curto», «sem emojis» e «sem apelidos» entram nas instruções dessa resposta.
- Isto melhora a preparação do pedido; **não é uma avaliação da qualidade de um modelo real**, nem uma garantia de que nunca voltará a haver repetição.
- No pedido directo de voz com conteúdo literal, a falha de TTS preserva esse conteúdo em texto, em vez de pedir ao modelo uma resposta diferente.
- O caminho directo identifica o áudio MP3 como `audio/mpeg`, em vez de o declarar Ogg/Opus. O texto efectivamente falado só entra no histórico após entrega não suprimida; o caminho de voz detectado na resposta também regista o texto entregue.
- Cancelar voz ultrapassada termina o turno sem tentar enviar um fallback conversacional novo.

### Casos cobertos pelos testes

| Entrada / situação | Comportamento verificado offline |
|---|---|
| Responder «O quê?» à mensagem «O prazo terminou ontem.» | A citação real chega ao pedido do modelo como referência principal. |
| «O quê?» sem histórico/citação | Pergunta específica de clarificação, sem chamada ao provider. |
| «Não era isso; quero saber como funciona o cache.» | A nova pergunta não é substituída pela clarificação local. |
| Nova pergunta durante geração antiga, com capacidade de fila igual a 1 | O cancelamento liberta a espera conversacional e permite avançar a fila simulada. |
| Outro participante envia uma mensagem | O turno da primeira pessoa não é cancelado. |
| «Aura manda um áudio dizendo Bom dia», com TTS indisponível | Texto contém «Bom dia», sem inventar outra resposta. |

## 4. Validação executada

Evidência: [`improvements-2026-10-18/validation-results.json`](improvements-2026-10-18/validation-results.json).

| Verificação | Resultado |
|---|---:|
| Scripts seleccionados e executados | **26/26 passaram** |
| Verificação de sintaxe JavaScript, incluindo o fragmento intencional com wrapper | **541/541 passaram** |
| Templates EJS | **37/37 passaram** |
| Cenários linguísticos da primeira ronda | **1.423 mantidos** |
| `git diff --check` | Sem erros |
| Ficheiros-fonte registados com SHA-256 na evidência | 319 |

Há três suites novas para contexto, helper de cancelamento e turnos canceláveis. Foram também ampliados os testes de pedidos/cache, handler e router, incluindo chegada concorrente de lotes, cancelamento com fila ocupada e propagação de sinal para voz. Os cenários linguísticos são derivados de modelos de frases: **não representam 1.423 novas capacidades, verbos independentes ou conversas avaliadas com IA real.**

O runner remove credenciais dos subprocessos e carrega o guard offline: bloqueia rede externa, base de dados e criação de processos filhos; só o teste de segurança permite loopback literal. Os testes usam mocks. O guard **não é uma sandbox de segurança** e estes resultados não certificam integrações reais.

Reproduzir a validação completa seleccionada, a partir da raiz do projecto e com as dependências aprovadas instaladas:

```bash
python3 scripts/run-fixes-validation.py --output docs/improvements-2026-10-18
```

Esse comando actualiza o ficheiro de evidência indicado. `npm run test:improvements` executa apenas as três suites novas; `npm run test:fixes` inclui as suites de correcções das duas rondas. O `npm test` global não foi executado.

## 5. Aplicação e limites

O bot já estar a funcionar no Northflank não significa que estas alterações locais estejam lá. **Não foram usados os providers, MongoDB, contas WhatsApp ou o serviço Northflank reais nesta validação.** A causa exacta dos atrasos de 13/17 minutos continua a exigir observabilidade da instância.

Para aplicar: rever/mesclar o pacote contra a base indicada, preservar as variáveis e sessões reais, repetir os testes e só então publicar e fazer deploy pelo processo autorizado. **Não substituir o ambiente por `.env.example`, não activar debug nem o reset legado de RPG.** O ZIP não contém `.env` real, credenciais, sessões ou dados de utilizadores.

Depois de um deploy autorizado, verificar numa conversa de teste:

- citação + «O quê?» e continuação de uma resposta;
- pergunta técnica com «curto, sem emojis»;
- nova pergunta durante uma resposta de texto/voz lenta;
- isolamento entre participantes e entre privado/grupo;
- voz literal, fallback em texto, pausa/retoma e ausência de respostas antigas em rajada.

Confirmar a revisão executada e medir tempos de fila, provider, TTS e MongoDB em logs sanitizados. Não partilhar tokens, QR, códigos de emparelhamento ou cookies.

**Pendências mantidas:** o audit de produção da primeira ronda continua a registar 18 entradas (0 críticas, 11 altas, 7 moderadas); esta ronda não alterou dependências nem repetiu o audit. Média nativa, migração de históricos duplicados, múltiplas réplicas, SSRF/buffering, execução dinâmica e restantes áreas do levantamento anterior não foram integralmente certificados. Não se afirma que todos os bugs estejam resolvidos. Não foram integrados recursos sexualmente explícitos.
