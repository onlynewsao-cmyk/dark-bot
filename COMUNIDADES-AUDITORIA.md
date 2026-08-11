# DARK BOT — Auditoria das Comunidades WhatsApp

Sessão de 2026-08-11. Auditoria no mesmo padrão da das APIs: não basta o
comando existir, tem de **entregar**. Todos os bugs abaixo foram confirmados
a correr o código, não a lê-lo.

---

## O que estava partido

### 1. `.addglb` — falhava 100% das vezes 🔴

```js
const mainJid = _groupCache.get('aldeia');
if (!mainJid) { results.errors.push('Grupo principal nao encontrado.'); return results; }
```

A chave `'aldeia'` **nunca existiu** em `COMMUNITY_GROUPS`. As chaves reais são
`arena / dungeons / trocas / cavernas / lazer / arsenal`. O comando saía sempre
pelo erro, mesmo com a comunidade criada e os 6 grupos a funcionar.

**Corrigido:** usa `lazer` → `arena` → primeiro grupo disponível.

### 2. Estado só em memória — o Render apagava tudo 🔴

`_communityJid`, `_groupCache` e `_clanGroups` eram `Map`s em RAM. O Render Free
reinicia o processo (deploy, idle, OOM) e o bot esquecia-se da comunidade
inteira. Depois disso, `.comunicado` não encontrava o Arsenal e `.darkrpg`
criava tudo outra vez, duplicado.

**Corrigido:** persistência em MongoDB (`darkrpg_community_v1` via
`botConfigCache`), com `loadState()` chamado por `.addglb`, `.comunicado`,
`.darkrpg-test` e `.darkrpg-status`. O `initCommunity` agora salta o que já
existe em vez de duplicar.

### 3. `.regras`, `.ranking`, `.evento`, `.welcome` — 4 funções inexistentes 🔴

`rpgSetup.js` chamava quatro coisas que o `community.js` nunca exportou:

| Chamada | O que o utilizador via |
|---|---|
| `community.COMMUNITY_RULES` | mensagem literal `undefined` |
| `community.generateLeaderboard()` | `❌ Erro: generateLeaderboard is not a function` |
| `community.EVENTS` | `❌ Erro no case evento: Cannot convert undefined or null to object` |
| `community.generateWelcomeMessage()` | crash |

**Corrigido:** as quatro escritas de raiz. `generateLeaderboard` suporta
`level`, `kills`, `berries` e `rep`.

### 4. O `groupParticipantsUpdate` não atira erro — o relatório mentia 🔴

O Baileys devolve `[{ status: '403', jid }]` quando o WhatsApp recusa
adicionar alguém (privacidade). **Não lança exceção.** O `catch` que devia
mandar o convite por PV nunca corria: ninguém recebia convite e o relatório
contava como "✅ adicionado" gente que nunca entrou.

**Corrigido:** lê o `status` do array. Só conta como adicionado se for `200`;
caso contrário manda convite por privado.

### 5. Cases mortos por colisão de nome 🟠

`registerCase` usa `onlyIfNew: true`, e os ficheiros carregam por ordem
alfabética. Resultado: **4 cases inalcançáveis**.

| Case em `rpgSetup.js` | Perdia para | Agora |
|---|---|---|
| `darkrpg` | `rpgCommunity.js` | `darkrpg-guia` |
| `regras` | `grupos.js` | `regrasrpg` |
| `welcome` | `grupos.js` | `bvrpg` |
| `menu-rpg` | `rpgCommunity.js` | `menu-rpg2` |

### 6. `!menu-rpg` anunciava 8 comandos que não existem 🟠

`despertar`, `portal`, `x1`, `gacha`, `cartas`, `forja`, `raid`, `addclan` —
verificados um a um contra `CASES`: nenhum registado. O utilizador escrevia e
não acontecia nada.

**Corrigido:** o menu só lista o que responde (`criarpersonagem`, `perfil`,
`nome`, `racas`, `vidas`, `lutar`, `quest`, `explorar`, `descansar`,
`inventario`, `loja`, `pocao`, `guilda`, `ranking`).

### 7. `.criaclan` podia cobrar 5000 berries e não entregar nada 🟠

`const groupJid = group.id;` rebentava se o Baileys devolvesse `null` — e não
havia guarda contra criar um segundo clã. **Corrigido:** valida o JID, falha
limpo antes de debitar, e bloqueia quem já tem clã.

### 8. Erro real das 3 tentativas deitado fora 🟠

O dono via sempre `"Falhou apos 3 tentativas"` sem saber se foi rate-limit,
sessão morta ou outra coisa. Agora reporta a causa real e o `.addglb` mostra
até 5 motivos concretos.

### 9. `communityCreate` podia dar falso negativo 🟠

O `communityCreate` do Baileys corre `parseGroupResult()`, que devolve `null`
se o parse falhar — **mesmo com a comunidade criada no WhatsApp**. Agora há
fallback via `communityFetchAllParticipating()` e guarda para versões do
Baileys sem suporte a comunidades.

---

## A API do Baileys (`@systemzero/baileys` 1.1.1) — verificada no código-fonte

Confirmado em `lib/Socket/communities.js`, ligado ao socket via
`makeCommunitiesSocket`:

- `communityCreate(subject, body)` — cria com `create_general_chat` e
  `allow_non_admin_sub_group_creation`
- `communityCreateGroup(subject, participants, parentJid)`
- `communityLinkGroup` / `communityUnlinkGroup`
- `communityInviteCode` / `communityRevokeInvite` / `communityAcceptInvite`
- `communityFetchLinkedGroups` / `communityMetadata` / `communityFetchAllParticipating`

Tudo existe. O problema nunca foi a biblioteca — foi o código à volta.

---

## Teste novo: `npm run test:comunidades`

`scripts/test-comunidades-real.js` — **13 verificações, 13 OK**. Já entra no
`npm test`.

Ao contrário do teste antigo (que só confirmava que os métodos existiam), este
simula o que corre mal a sério:

- **A.** Cria comunidade + 6 grupos e confirma que gravou no MongoDB
- **B.** Limpa o `require.cache` (= reinício do Render) e confirma que
  `loadState()` recupera os 6 grupos e o JID da comunidade
- **C.** `.addglb` encontra o grupo principal — o bug do `'aldeia'`
- **D.** WhatsApp devolve `403`: não mente no relatório e cai para convite
- **E.** `rate-overlimit` e grupo `null` chegam ao dono com o motivo
- **F.** Baileys sem suporte a comunidades avisa em vez de crashar

Suite completa: **295 testes**, sem regressões.

---

## O que continua por confirmar

Isto tudo foi testado com um `sock` simulado — fiel à API real do Baileys
(li o código-fonte para o construir), mas simulado. O que **só o WhatsApp
verdadeiro pode dizer**:

1. Se a conta do bot tem permissão para criar comunidades (contas novas ou
   marcadas às vezes não têm).
2. O rate-limit real ao criar 6 grupos seguidos — pus 8s entre cada um, mas
   pode não chegar.
3. Se o `parseGroupResult` devolve metadata ou `null` na prática — o fallback
   está lá, mas nunca disparou a sério.

**Corre `.darkrpg` no WhatsApp e manda-me o relatório que ele imprime.** Agora
que os erros já não são engolidos, o texto que aparecer diz exactamente onde
parou.

---

# v6.64 — O `rate-overlimit` resolvido

O utilizador correu `.darkrpg` no WhatsApp real. A comunidade **foi criada**,
mas os 6 grupos falharam todos com `rate-overlimit`. Pista decisiva que ele
deu: **a AURA cria grupos sem problema** (`.criargrupo`).

Se a AURA consegue e o `.darkrpg` não, a conta não está limitada. A diferença
está no código.

## Causa raiz: 5 queries por grupo em vez de 1

Contagem lida no `@systemzero/baileys` 1.1.1:

**AURA → `sock.groupCreate()`**
| # | Query |
|---|---|
| 1 | `create` |
| — | `extractGroupMetadata()` = parse **local** do XML, 0 queries |
| | **TOTAL: 1 query** ✅ |

**`.darkrpg` (antes) → `sock.communityCreateGroup()` + descrição + promote**
| # | Query |
|---|---|
| 1 | `create` |
| 2 | `parseGroupResult()` → `sock.groupMetadata()` ← **escondida** |
| 3 | `groupUpdateDescription()` → `groupMetadata()` ← **escondida** |
| 4 | `groupUpdateDescription()` → `set` |
| 5 | `groupParticipantsUpdate()` promote |
| | **TOTAL: 5 queries × 6 grupos = 30** ❌ |

O `communityCreateGroup` do Baileys chama `parseGroupResult()`, que dispara um
`groupMetadata()` **extra** só para converter a resposta num objecto. O
`groupUpdateDescription` faz outro. São 4 queries desperdiçadas por grupo.

Ao 2º/3º grupo o WhatsApp corta. E como o retry também gastava 5 queries,
nunca recuperava — daí os **6 falharem seguidos**.

## Correcção

1. **1 query por grupo.** Mandamos o stanza `create` em cru via `sock.query`
   (o mesmo XML que o Baileys manda) e lemos o JID direto do XML de resposta
   com `getBinaryNodeChild`. Zero queries escondidas — igual à AURA.
2. **`<linked_parent>` no próprio stanza de criação**, que é o que a app do
   WhatsApp faz. O grupo nasce dentro da comunidade sem chamada separada.
3. **Descrição e promote adiados** para depois de todos os grupos existirem.
   São cosmética: se falharem, o grupo existe na mesma.
4. **15s entre grupos** (era 8s) e **60s** de espera após `rate-overlimit`
   (era 15s — não chegava nem perto).
5. **Pára ao primeiro `rate-overlimit`** em vez de queimar mais 5 tentativas,
   e explica ao dono o que fazer.
6. **Retomável:** o que já foi criado está no MongoDB. Correr `.darkrpg` outra
   vez continua de onde parou, sem duplicar.

## Teste novo: `npm run test:ratelimit`

`scripts/test-comunidades-ratelimit.js` — 8 verificações, 8 OK. Conta as
queries e simula o WhatsApp a cortar a meio:

- 1 query por grupo (era 5)
- `linked_parent` + `participant` vão no stanza de criação
- Com apenas 4 queries de folga ainda cria 4 grupos (antes: 0)
- Ao levar corte, pára e avisa em vez de insistir
- Ao retomar, reaproveita os já criados e acaba os 6

Suite completa: **303 testes, 0 falhas**.

## O que fazer agora

Espera **~1 hora** desde a última tentativa (o WhatsApp ainda tem a conta
marcada) e corre `.darkrpg` outra vez. A comunidade DARK VILLE já existe e
está guardada — ele salta-a e cria só os grupos, um a cada 15s.

Se voltar a dar `rate-overlimit` logo no primeiro grupo, a conta está mesmo
em castigo temporário e só o tempo resolve.

---

# v6.65 — O bot adopta a comunidade que tu criaste

O utilizador criou a comunidade pela app do WhatsApp (com o **Geral** e o
**Comunicados** que o WhatsApp gera sozinho) e pediu: *"cabe ao bot
identificar e adicionar o dono lá e criar os grupos e adicionar na
comunidade e depois o RPG"*.

Isto é a solução certa para o `rate-overlimit`: **criar a comunidade pela app
custa ZERO queries ao bot**. O gasto passa a ser só os grupos.

## Como funciona agora

`!darkrpg` deixou de criar às cegas. A sequência é:

1. **Varre** (`groupFetchAllParticipating` — **1 query**) e devolve todas as
   comunidades e grupos com metadata: `isCommunity`, `linkedParent`,
   `isCommunityAnnounce`, `participants`.
2. **Escolhe** a comunidade: a que tiver `DARK`/`VILLE` no nome; se só houver
   uma, essa; senão a mais recente. `!darkrpg <nome>` força outra.
3. **Adopta os subgrupos** que já lá estão. O `Geral` fica registado como
   `geral` (é o que o `.addglb` usa) e o `Comunicados` é reaproveitado como
   **Arsenal da Fama** — não cria um duplicado.
4. **Mete o dono lá dentro**: se estiver fora, `add`; se não for admin,
   `promote`. Se já for admin, não gasta query nenhuma.
5. **Cria só os grupos que faltam** (1 query cada, com `<linked_parent>`
   embutido) e liga-os à comunidade.

Como o `Comunicados` é reaproveitado, são **5 grupos novos** em vez de 6.

## O que o dono vê

```
🕸️ DARK🕸️VILLE — PRONTA!
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DARK VILLE (adoptada)
✅ Arena das Sombras
✅ Dungeons Proibidas
✅ Ville de Trocas
✅ Cavernas Sombras
✅ Lazer e Memes
✅ Arsenal da Fama (já existia)
━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 Encontrei a tua comunidade:
📛 DARK VILLE

📂 Já lá estavam:
  • DARK VILLE
  • Comunicados

👑 Tu:
  ✅ Dentro da comunidade
  ✅ Admin
  ▸ promovido a admin
```

Se não houver comunidade nenhuma, explica: cria pela app, adiciona o bot, e
corre outra vez. Quem quiser mesmo que o bot crie usa `!darkrpg criar`.

## Teste novo: `npm run test:adopcao`

`scripts/test-comunidade-adopcao.js` — **22 verificações, 22 OK**:

- Identifica a comunidade e **não confunde com grupos soltos**
- Regista o `Geral` e reaproveita o `Comunicados` como Arsenal
- Dono fora → adiciona e promove; já admin → não gasta queries
- Fluxo completo: adopta + cria os grupos, **todos ligados à comunidade**
- Correr 2x **não duplica** nada
- Sem comunidade → mensagem que explica o que fazer
- Várias comunidades → escolhe por nome (`!darkrpg Família`)

Suite completa: **325 testes, 0 falhas**.

## O que fazer agora

Corre **`!darkrpg`** no WhatsApp. Antes disso confirma duas coisas:

1. O **bot está dentro** da comunidade que criaste.
2. O bot é **admin da comunidade** — sem isso não te consegue promover nem
   criar grupos lá dentro (vais ver `não consegui promover-te` no relatório).

Se tiveres mais que uma comunidade, usa `!darkrpg DARK VILLE` para escolher.
