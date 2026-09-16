# AURA contextual — comportamento recuperado

Patch sobre v7.72.0 · 16/09/2026 · **Push autorizado pelo dono; deploy não validado**

## O comportamento escolhido

AURA acompanha o contexto disponível, responde quando falam com ela e participa com os outros quando o dono pede. Resumos são apenas por pedido, nunca relatórios automáticos ao privado. O histórico usado é o que o bot recebeu e ainda tem disponível; não existe acesso retroactivo a todas as conversas do WhatsApp.

## Como falar com ela

| Pedido | Resultado |
|---|---|
| **Aura, acorda aqui** | Acorda no grupo e abre a janela de conversa contigo. Durante a janela de 3 minutos, podes continuar sem repetir o nome; as respostas renovam a janela. |
| **Aura, o que achas disto?** | Responde com o contexto disponível. Citar a mensagem reduz ambiguidades. |
| **Aura, interage com todos** | Abre participação contextual neste grupo sem pausa obrigatória ou prazo automático, até pedires para parar/dormir (sem marcação em massa). Também aceita “conversa com todo mundo” e “fala com todos”. |
| **Aura, para de interagir** | Termina a sessão de participação geral. Continua a responder a chamadas directas. |
| **Aura, resume o grupo** | Resume os excertos e eventos disponíveis do grupo actual. Só o dono usa este novo fluxo de relatórios. |
| **Aura, resumo do grupo Equipa** — no PV | Procura o nome exacto entre os grupos do bot e confirma a participação actual do dono antes de resumir. Nomes duplicados exigem identificador inequívoco. |
| **Aura, resumo do grupo Equipa ontem** | Filtra os excertos pelo dia em Africa/Luanda. Sem registos, assume a limitação. |
| **Aura, isso é verdade?** — citando texto | Procura fontes externas e distingue o que confirmam do que continua incerto. Sem fontes, não declara verdadeiro ou falso. |
| **Aura, dorme** | Usa o controlo de presença existente e cancela a sessão de participação contextual. |

“Fala com todos **que amanhã há reunião**” continua a ser um pedido de recado pelo fluxo anterior; não é confundido com a abertura de uma sessão de conversa.

## O que foi corrigido

1. **Atendimento dirigido:** pedidos directos e conversas activas deixam de ser silenciados aleatoriamente pelo humor ou por `[SILENCIO]`, mesmo com saturação elevada. Inclui o privado do dono e a participação convidada. A pedido do dono, não há este limitador de frequência na AURA; os filtros de moderação dos grupos, gates de IA, aluguer e permissões existentes são independentes e permanecem.
2. **Continuidade ao acordar:** acordar abre a janela de conversa e remove o modo mudo do cérebro naquele grupo.
3. **Contexto real:** a geração da AURA recebe excertos com autores e datas, não apenas estatísticas de quem falou. Uma resposta dirigida a outro participante não é tratada automaticamente como continuação da conversa com a AURA.
4. **Participação por convite:** dono abre sessão por grupo, sem expiração automática e sem intervalo mínimo entre admissões. Mensagens curtas também podem receber resposta. Chamadas directas mantêm o atendimento próprio. Comandos, menções a outros e respostas dirigidas a terceiros não disparam a iniciativa geral.
5. **Resumos sem acções:** caminho de leitura separado do executor de comandos; não executa marcadores gerados pela IA. Reentregas do mesmo evento são deduplicadas.
6. **Rigor:** instruções para distinguir observações, afirmações, inferências e fontes externas; planos futuros não são factos garantidos. A qualidade semântica depende do provider e deve ser validada com exemplos reais.
7. **Pesquisa identificável:** Tavily passa a conservar URLs e datas quando fornecidas. A síntese de resumos usa `allowWeb: false`, para não pesquisar o histórico privado na web. Os excertos continuam a ser enviados ao provider de IA configurado para gerar o resumo.

## Configuração

```env
AURA_PARTICIPATION=contextual
```

Este é o padrão mesmo sem a variável. No modo contextual, o timer de proactividade fica desactivado, inclusive se `aura_proactive_enabled` estiver ligado no dashboard. Não há check-ins nem relatórios novos agendados por este módulo. Reacções e agendas que já tenham sido explicitamente configuradas noutros módulos não foram removidas.

Para optar pelo comportamento anterior de iniciativa por timer:

```env
AURA_PARTICIPATION=proactive
```

O modo anterior continua a respeitar as definições de proactividade do dashboard. A alteração desta variável requer reinício do serviço.

A geração precisa de um provider de IA configurado em segurança. A verificação deste novo fluxo usa `TAVILY_API_KEY`; sem ela ou sem resultados, a AURA diz que não conseguiu confirmar. Não foram configuradas credenciais reais.

## Limites importantes

- O cache existente tem aproximadamente 2.000 mensagens no total, partilhadas entre chats, e não sobrevive a reinícios. Os resumos usam até 50 excertos recentes, pesquisando até 300 registos do chat; o contexto de conversa usa até 12 excertos. Não é arquivo completo nem memória ilimitada.
- A linha do tempo existente pode fornecer eventos persistidos, mas não substitui uma transcrição completa. Resumos com filtro hoje/ontem usam apenas mensagens filtradas, sem misturar eventos fora desse período.
- As sessões de participação não têm prazo, mas desaparecem ao reiniciar ou ao pedir para parar/dormir. O estado em memória mantém um limite técnico de 200 chats; ao excedê-lo, o mais antigo é removido. Não foi criada persistência adicional de conversas.
- Texto e legendas disponíveis entram no contexto. Uma imagem/áudio sem texto legível não é automaticamente transcrita por este módulo de verificação; a AURA pede a afirmação ou a fonte em vez de usar outra mensagem por engano. Os fluxos multimodais anteriores mantêm-se.
- Resumos de outros grupos só são entregues no privado, com nome exacto/identificador e participação confirmada. Não se agregam conversas privadas de terceiros.
- A AURA não certifica automaticamente cada mensagem recebida e não sabe o futuro. A consulta externa explícita pode falhar, ser incompleta ou encontrar fontes discordantes.
- A versão do pacote permanece 7.72.0: trata-se de um patch, sem tag de release nova.

## Validação

**14 scripts npm seleccionados passaram** após as alterações:

`syntax`, `ejs`, `commands`, `smoke`, `roles`, `auramodes`, `aurabrain`, `auravontade`, `auraaudit`, `auraproativa`, `prefixoauto`, `incoming`, `e2e`, `auracontextual`.

- 227 JavaScript sem erros de sintaxe; 33 templates com tags EJS equilibradas.
- Novo `test:auracontextual`: **54 verificações**, sem rede, MongoDB ou WhatsApp reais.
- `test:e2e`: **21 verificações**, incluindo acordar → continuar apesar de silêncio/humor, convite → participação de membro sem prefixo, resumo a partir do cache e cancelamento, pelo handler real com serviços simulados.
- Testes do comportamento proactivo antigo passam com opt-in explícito; expectativas de comentários aleatórios foram separadas do novo padrão contextual.
- `git diff --check` passou.

O `npm test` completo e os providers reais não foram executados nesta alteração. Logs: `/home/user/revisao-dark-bot/contextual-*.log` e `contextual-resultados.tsv`.

## Ficheiros principais

Novo módulo: `src/aura/auraContextual.js`. Integração: `commandHandler.js`, `auraDecide.js`, `auraVontade.js`, `auraUniversal.js`, `auraHuman.js`, `auraHistorico.js`, `auraProativa.js`, `ai.js`. Testes e `.env.example` actualizados.

Antes de produção: rever o diff, configurar providers fora do Git, testar com uma conta/grupo de desenvolvimento e manter uma única instância WhatsApp. O dono autorizou o push deste patch para main. O estado do serviço de produção precisa de validação separada; não foi aberta nenhuma sessão WhatsApp neste workspace.

## Ajuste final solicitado pelo dono

Retirados os limites artificiais da participação AURA (45 segundos / 30 minutos) e o silêncio por saturação em conversas dirigidas/convidadas. Conservados: parar/dormir, isolamento, permissões, deduplicação de eventos e limites técnicos de memória. O modo continua contextual; não activa publicidade, broadcast nem relatórios automáticos. Maior volume pode aumentar custo de IA e provocar restrições da plataforma WhatsApp.

## Correcção: grupos atendem como o PV (16/09/2026)

Reproduzido localmente: com `ai_auto_enabled=false`, a confirmação de acordar funcionava, mas as mensagens seguintes ficavam barradas antes da geração. Não é uma confirmação da configuração do servidor do utilizador, que não foi consultado.

- O toggle de iniciativa automática já não bloqueia atendimento solicitado num grupo acordado: nome/menção/reply, janela de conversa activa ou convite para participar. Conversas alheias não passam a receber respostas indiscriminadas.
- `Aura, oi` e saudações com pontuação são reconhecidas. Os caminhos de acordar centralizam a confirmação do modo e abertura da janela; gravações falhadas não anunciam sucesso.
- Envios concluídos são acompanhados por `auraDelivery.js`. Reacções não contam como resposta textual; falhas inesperadas recebem aviso sem stack/segredos, desde que o transporte WhatsApp permita enviar. Não se duplica o aviso se já houve uma resposta entregue.
- O privado continua no mesmo caminho. Utilizadores/grupos bloqueados, aluguer e moderação não foram desactivados.
- Corrigida uma referência indefinida (`prompt` em vez de `text`) na composição do contexto temporal/tamanho em `auraHuman`.
- O aviso “ANTI-LINK-EASY” fornecido pelo utilizador não corresponde ao aviso nativo `DARKSHIELD ANTI-LINK v2`. Não foi alterada uma eventual moderação de outro bot. O anti-link próprio ignora mensagens `fromMe` da AURA.

Validação final: **15 scripts npm seleccionados passaram**. `test:e2e`: **37 verificações**, incluindo a sequência da captura com auto-IA off e teste de aviso por excepção; `test:auradelivery`: **14 verificações**; `test:auracontextual`: **54 verificações**. Dependências instaladas com scripts de instalação desactivados; modelos de dados, WhatsApp e IA simulados nos testes de fluxo. Nenhuma sessão WhatsApp real ou provider de IA de produção foi usado.

Logs: `/home/user/revisao-dark-bot/grupos-*.log`. A regressão foi observada antes da correcção em `grupos-antes.log`; resultados finais em `grupos-resultados.tsv`. A suite completa não foi executada. Push desta correcção segue o fluxo autorizado; deploy e comportamento real ainda precisam de confirmação no serviço.
