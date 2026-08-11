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
