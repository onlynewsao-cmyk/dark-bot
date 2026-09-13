# Integração dos cases recebidos

> ✅ **INTEGRADOS (v7.47, 2026-09-13)** — os 19 ficheiros foram convertidos para o
> contexto nativo do DARK BOT, testados (`npm run test:incoming`, 76 checks) e
> registados. Este ficheiro passa a ser o mapa da integração; os `.txt` ficam
> como referência histórica, sem efeito em runtime.

## Regra de integração (aplicada)

Cada case foi convertido para o contexto nativo (`sock`, `msg`, `m`, `quoted`,
`text`, `args`, `prefix`, `isOwner`, `isAdminFn`) e passou por sintaxe,
dependências, permissões, timeout e teste simulado antes de ser registado.

## Mapa ficheiro → implementação

| # | Ficheiro | Comandos | Destino | Notas |
|---|---|---|---|---|
| 1 | `Spotify.txt` | `spotifysearch`, `spsearch` | `cases/incomingTools.js` | `spotify` nativo já era superior (sem key waguri); snippet virou alias que delega |
| 2 | `Tool - TO URL 🔗.txt` | `tourl` | `cases/incomingTools.js` | ESM→CJS; upload catbox→0x0.st sem key (fetch/FormData nativos) |
| 3 | `consultr CEP .txt` | `cep` (enriquecido) | `cases/search2.js` | Nativo já existia; snippet contribuiu `região` + `complemento` |
| 4 | `fakemsg por quoted.txt` | `fakechat` | `cases/incomingTools.js` | `fakemsg` nativo = outra técnica (edit); quote-falso é comando novo |
| 5 | `fakesms.txt` | `fakemsg` (já existia) | `cases/extras.js` | Comportamento idêntico já implementado — sem duplicar |
| 6 | `fatos desconhecidos.txt` | `fdc`, `fatos`, `curiosidade` | `cases/incomingTools.js` | zone.api.br + 8 factos offline de fallback |
| 7 | `grok 4.5.txt` | `grok` | `cases/incomingTools.js` | zone.api.br + fallback para IA nativa (`ai.chat`) |
| 8 | `tikpic.txt` | `tiktokphoto`, `photooxytiktok` | `cases/incomingTools.js` | SystemZone com key via env; corrigida chave `}}` do snippet |
| 9 | `tomp3.txt` | `tomp3` (fundido) + `tomp3video`, `videoaomp3` | `cases/downloads2.js` | Com mídia citada → ffmpeg local (execFileSync, sem shell); com URL → YouTube (original) |
| 10 | `criar pdf.txt` | `pdf`, `criarpdf`, `gerarpdf` | `cases/incomingTools.js` | Conteúdo via IA nativa; `pdfkit` (nova dep) em memória, fallback `.txt` |
| 11 | `Comando Modular Info Perfil Free Fire.txt` | `infoff`, `ffinfo`, `perfilff` | `cases/incomingTools.js` | Nyx API; token via `NYX_FF_TOKEN` (sem `SEU_AUTH` fixo) |
| 12 | `Comando Modular Likes Free Fire.txt` | `like`, `enviarlike`, `darflw` | `cases/incomingTools.js` | Idem, com cooldown da API |
| 13 | `UpScale - Image 🏞️.txt` | `upscale`, `hd`, `remini` | `cases/incomingTools.js` | ESM+form-data → CJS com fetch/FormData nativos; mensagens em PT |
| 14 | `delstts.txt` | `delstts`, `delstatus`, `rmstts` | `cases/incomingAdmin.js` | ESM→CJS; permissões nativas (sem OWNER fixo); modo só-com-quote |
| 15 | `case de nano banana editor.txt` | `edits`, `editl`, `editlimpar`, `edit`, `editimg`, `aiedit` | `cases/incomingTools.js` | form-data→nativo; sessões em Map (5 min); polling job zone.api.br |
| 16 | `abrir grupo.txt` | `abrirgp`, `abertura`, `fechargp`, `fechamento`, `horariosgp`, `verhorarios`, `limparhorarios` | `cases/incomingAdmin.js` + `scheduler.js` | JSON+setInterval(1s)→Mongo+tick 30s; fuso Africa/Luanda; anti-repetição/dia |
| 17 | `Anti-fobados.txt` | `antifoba`, `antifobados`, `anticarente`, `fobadd`, `fobdel`, `fobalista` | `cases/incomingAdmin.js` + `bot/antiFoba.js` | Flag+blacklist no GroupSettings; hooks em messageRouter + groupEvents |
| 18 | `auto-apresetacão.txt` | `autoapresentar`, `autoapresentacao`, `apresentacao` | `cases/incomingAdmin.js` + `bot/autoApresentar.js` | Flag no GroupSettings; timers unref; cancela ao falar; remove aos 5 min |
| 19 | `campo minado.txt` | `minado`, `campominado` | `cases/incomingGames.js` | Corrigido `False`→`false` (era SyntaxError); store em Map |

## Bloqueadores (resolvidos)

- ~~Snippets, não ficheiros prontos~~ → convertidos à mão para `registerCase`.
- ~~`systemZR/conn/waguri/fetchJson/sendImage/sendAudio/okarunsite/API_KEY_WAGURI`~~ → mapeados para `sock`/`m` nativos ou removidos (waguri desativado).
- ~~`pdfkit`/`form-data` ausentes~~ → `pdfkit` adicionado ao package.json+lock; `form-data` substituído por fetch/FormData nativos do Node 20.
- ~~ESM (`export default`) misturado~~ → convertido para CommonJS.
- ~~`exec` com shell~~ → `execFileSync` com argv (tomp3) ou eliminado.
- ~~LID vs número~~ → motores novos usam comparação por dígitos + admin via groupMetadata.

## Ficheiros tocados (v7.47)

- Novos: `src/bot/cases/incomingTools.js`, `incomingGames.js`, `incomingAdmin.js`,
  `src/bot/antiFoba.js`, `src/bot/autoApresentar.js`, `scripts/test-incoming-cases.js`
- Editados: `GroupSettings.js` (6 campos), `scheduler.js` (horários),
  `messageRouter.js` + `groupEvents.js` (hooks), `downloads2.js` (tomp3),
  `search2.js` (cep), `submenuData.js` (overrides), `commandDescriptions.js`,
  `auraUniversal.js` (sinónimos + ADMIN_RE), `package.json` (pdfkit, 7.47.0),
  `package-lock.json`, `.env.example`, `COMMANDS-ATIVOS.md` (1944 cases),
  `NORTHFLANK_DEPLOY.md`
- Micro-fixes na suite: path hardcoded em `test-selecao-cmds.js`,
  `addpalavra` sem args lista em vez de "Uso:", `russa` ("Use !heal"→"Usa !heal"),
  `isAuraInvoked` lê o registo (human-by-default partia o e2e),
  `test-ia-audit` sem os 9 aura removidos na v7.40, regex do
  `test-menu-routing` aceita `diagnostico` em qualquer posição,
  duplicado `HUMANIZE` removido do `.env.example`,
  `aura` (poder RPG) remapeado ia→interacoes em `submenuData.js`.

## Validação

```bash
npm run test:incoming   # 76/76
npm run test:orgcomandos # sem órfãos/fantasmas
npm run test:selecao    # 0 sem efeito
npm test                # suite completa
```
