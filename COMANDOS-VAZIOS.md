# DARK BOT — Inventário de comandos vazios / sem funcionalidade

> Gerado em 14-08-2026. Fonte: `src/bot/cases/stubs.js` (stubs) cruzados com
> os comandos reais (cases + nativeCommands + catálogo).
>
> Um stub só fica **activo** se NÃO existir implementação real noutro lado
> (`registerCase(..., true)` = onlyIfNew). Os números abaixo são os **activos**.

## Resumo

| Tipo | Total no ficheiro | Activos (órfãos) |
|---|---|---|
| `hD` — **VAZIO** (responde só "Uso: <args>") | 263 | **171** |
| `hZ` — "zoeira" fake (percentagens aleatórias) | 226 | (a confirmar) |
| `hR` — rank fake (percentagens aleatórias) | 78 | (a confirmar) |
| `hE` — economia fake (moedas/XP aleatórios) | 90 | (a confirmar) |
| `hI` — interacção fake (texto aleatório) | 54 | (a confirmar) |
| `hA` — admin (misto: open/close/linkgp reais) | 112 | (a confirmar) |
| `hT` — fonte/texto (tem função real) | 21 | — |
| `hIA` — IA (tem função real) | 38 | — |
| **TOTAL stubs** | **882** | **666 órfãos** |

## ✔️ Já corrigidos

- [x] `rankativos` / `rankativo` / `rankinativo` → ranking real de atividade (GroupMemberActivity)
- [x] **DOWNLOADS (auditado: 93/93 com handler)** — os 3 mortos do menu:
  - `yt3v2` → alias do download de vídeo YouTube (`baixarvideo`)
  - `letra` → alias da `forca` (adivinha a letra)
  - `vd` → novo jogo "verdade ou desafio" (escolhe verdade/desafio ao acaso)
- [x] **DOWNLOADS que não entregavam (v7.4)** — APIs públicas de download social
  estavam mortas em 2026 (zahwazein, akuari, ryzendesu, davidcyriltech, delirius;
  `systemzone.store` = 502; `api.spotifydown.com` offline). Corrigido:
  - `instagram`/`facebook`/`twitter` → fallback **yt-dlp** (`downloader.js`), que funciona
  - `spotify`/`soundcloud` → fallback **busca YouTube → áudio via yt-dlp** (a música chega)
  - `kwai` → yt-dlp (suporta Kwai/Kuaishou) primeiro; zahwazein só como 2.º
  - `tiktoktxt`/`tiktokstalk`/`ttstalk` → pesquisa real (tikwm) do perfil, mostra vídeos em alta
  - `shazam` → identifica a música **pela letra via IA** (antes era texto falso "marca um áudio")
  - descrição do `shazam` corrigida (regex `sha` apanhava-o como "Codifica/descodifica")
  - `.env.example` com `COBALT_API_URL`/`YT_PROXY_URL` para quem quiser instância privada
- [x] **STICKERS & IMAGENS (v7.5)** — auditado 54/54 com handler. Os 9 que eram vazios:
  - `figanime`/`figcoreana`/`figdesenho`/`figemoji`/`figengracada`/`figmeme`/`figraiva`/`figroblox`
    → packs de figurinhas **reais por categoria** (busca no Sticker.ly, estáticos + animados)
  - `gif <busca>` → envia **GIF real** (Tenor → APIs de anime)
  - (`faber`/`jeff`/`norian` já funcionavam — registados via loop em stickers2.js; falso alarme da auditoria por regex)
- [x] **IA & CHATBOTS (v7.5)** — auditado **80/80 com handler real**. Já estava completo:
  - modelos (claude, gpt4/5, llama, qwen, gemma, mistral, kimi, …) → `makeModelHandler` em ia2.js
  - utilitários (corrigir, explicar, resumir, resumirurl/chat, ideias, debater, recomendar) → ia2.js
  - imagem/news/pesquisar/deepsearch + memória (aimemoria/airesetar) → ia.js
  - aura* (acordaaura, auraon/off, auramodo, aurasai, auragrupos…) → auraInvoke.js
  - iawhatsapp/metaai → nativeCommands.js · microsoft-ai → online.js · philosophy → random.js
  - adicionei `test:ia-audit` (80/80) para o futuro
- [x] **JOGOS & DIVERSÃO (v7.5)** — auditado **68/68 com handler real**. Os 4 vazios:
  - `genio` → charadas de lógica com recompensa (vale coins + XP)
  - `shipo` → variante do `ship` (compatibilidade %)
  - `desafiosemanal` / `desafiomensal` → desafio rotativo por data (semana/mês)
  - bónus: `dice` tinha descrição errada no submenu ("Cria uma imagem estilizada")
    porque a regex de efeitos de logo casava "ice" dentro de "d**ice**" — corrigido com \b
  - adicionei `test:jogos-audit` (68/68)
- [x] **INTERAÇÕES & FAMÍLIA (v7.5)** — auditado **121/121 com handler real**. Os 6 stubs:
  - `abracarrpg` / `beijarrpg` → aliases do `abracar`/`beijar` reais (GIF)
  - `crente` (e bónus `ateu`/`ateia`) → medidor percentual real com GIF
  - `hallobat` → acção divertida (morcego de Halloween) com GIF
  - `suic` / `suicidio` → **mensagem de apoio real** (não é piada/jogo)
  - ⚠️ removi as linhas de stub destes comandos em stubs.js — os casos correm
    ANTES dos pacotes, por isso as versões reais só ganham se o stub sair
  - adicionei `test:interacoes-audit` (121/121)

## Comandos FORA de lugar neste submenu (detectados na auditoria)

Segundo o catálogo oficial (`commandCatalog.js`) e a semântica dos handlers:

| Comando | Categoria correcta | Porquê |
|---|---|---|
| `aceitarinvocacao` / `recusarinvocacao` | **dono** | comandos owner-only |
| `desistir` | **jogos** | cancela a forca/jogo |
| `casal` | **diversao** | par aleatório (não família) |
| `malucao` | **diversao** | medidor de zoeira |
| `cat` / `dog` | **utils** | imagens de animais |
| `pedir` | **economia** | pede esmola (coins) |
| `negrito` | **texto** | formatação de texto |
| `telefone` | **jogos** | jogo "telefone sem fome" |
| `missoes` / `eventos` | **rpg/economia** | missões do RPG |
| `train`/`treinarpet`, `equippet`, `unequippet`, `petbattle`, `petbet`, `petnome`, `renamepet`, `evolve` | **rpg/economia** | sistema de pets/RPG |

- [x] **DONO & SISTEMA (v7.5)** — auditado **62/62 com handler real**:
  - os 22 "gestores de cases" (`newcase`, `runcase`, `remcase`, `downcase`, `showcase`,
    `testcase`, `auditcmds`, `mycases`, `reloadcases`, …) já existiam — registados
    dentro do próprio `caseHandler.js` (não em `cases/*.js`), por isso pareciam mortos
  - `flood` → implementado com travões anti-ban (só Dono, máx 5 msgs, cooldown 20s)
  - `_adultSend` e `__change_theme_handler__` → eram FUNÇÕES INTERNAS que vazaram
    para o menu DONO. Adicionei filtro em `submenuData.buildItems` para esconder
    comandos que começam por `_` — já não aparecem em nenhum submenu
  - adicionei `test:dono-audit` (62/62 + internos escondidos)
- [x] **ZOEIRA & MEDIDORES (v7.5)** — 24 dos 25 eram medidores FAKE (hZ/hE, % aleatória sem GIF).
  Convertidos em medidores **reais com GIF** (`percentage()` em interactions.js):
  - novos: atleta, bebado2, ciumao, desapegado, dorminhoco2, fraco, insone, inveja,
    pecador, pirocudo, possessivo, sono, sorte, viciado
  - aliases: burro2→burro, feio2→feio, gay2→gay, lindo2→lindo, invejosa/invejoso→inveja,
    pirokudo→pirocudo, sortudo2→sorte, viciada/viciadao→viciado
  - (doido já era real)
  - removidas as 24 linhas de stub; descrições próprias no submenu
  - adicionei `test:zoeira-audit` (25/25)
- [x] **TEXTO & UTILIDADES (v7.5)** — auditado completo:
  - `piada`/`charada`/`elogio`/`motivacional` usavam o handler de FONTE (errado) → agora
    são conteúdo real (piadas, charadas com resposta oculta `||spoiler||`, elogios, frases)
  - `frase` estava MORTO (no catálogo/menu sem handler) → virou alias de `motivacional`
  - `hora`/`data` (faltava, estava no SEL_PATTERNS) → comando real de hora/data/fuso
  - `help`/`ajuda`/`comandos`/`cmds` (faltava) → alias do `menu`
  - adicionei `test:texto-audit` (68/68)

## Auditoria de ACÇÕES DIRECTAS (todos os submenus) — v7.5

Script `scripts/test-submenus-full-audit.js` (runtime, ~2min):
- 16 submenus, **0 itens sem handler** ✅
- 351 acções directas (sel), **0 sem handler** ✅
- Limpei os padrões SEL mortos que apontavam para comandos inexistentes
  (restart, reconnect, clearLogs, clearCache, clearAllChats, setbomsg, actgp,
  goodbye, copyjid, myjid) e corrigi typos (tecnologicas→tecnologica, leader→lider)

- [x] **SEARCH & STALK (v7.5)** — auditado **45/45 com handler real**:
  - `robloxcodes` era stub vazio → virou alias de `rbxcodes` (códigos Roblox)
  - `mangá` (acentuado) já existia como alias de `manga` — o detector sem acentos não o via
  - anime (Jikan/MAL), animeapi/animedl/episódios, mangá, github stalk, cep/cnpj/ip,
    google/pesquisar/noticias/deepsearch, wiki — tudo com handler real
  - adicionei `test:search-audit` (45/45, normaliza acentos)

- [x] **EFEITOS DE ÁUDIO (v7.5)** — auditado **52/52 com handler real**:
  - 50 efeitos com filtro ffmpeg real (`audioAdmin2.js` → `AUDIO_FILTERS` + loop)
  - `audiofx` → dispatcher nativo (aplica qualquer efeito por nome)
  - `audiomeme` usava `systemzone.store` (API morta, 502) → agora usa **MyInstants**
    (vivo) como fonte primária, com systemzone só de fallback
  - adicionei `test:audio-audit` (52/52 + verifica MyInstants)

## ⏳ Ainda por fazer (bulk)

- **~170 medidores ZOEIRA ainda são fake** (hZ/hE em stubs.js). O submenu zoeira tem
  203 itens (todos sel), mas só ~30 têm `percentage()` real com GIF. Converter o resto
  em lote (mapear nome→emoji+gif) é mecânico e vale a pena fazer a seguir.

## 📋 Por corrigir — os 171 VAZIOS (hD activos)

```
abraco, afk, america, americanflag, amongus, avaliar, avengers, ballon,
battlefield, beijo, blackhzx, blackpink, blood, blue-logo, bug, butterfly,
ca, candy-logo, captain, captainamerica, cemetery, cemiterio, checkativo,
cloudsky, comic-logo, comics, cool-logo, crente, darkgreen, deadpool,
desafiomensal, desafiosemanal, doubleexposure, dragonfire, elegant-logo,
eraser, faber, ffavatar, ffgren, ffrose, figanime, figcoreana, figdesenho,
figemoji, figengracada, figmeme, figraiva, figroblox, fire-logo, firework,
flag, flaming, flood, fluffy-logo, fortune-logo, frozen, galaxy, galaxy-light,
game, gear, genio, gif, gitbot, glitter, glossy, glossy-logo, gold-logo,
goldpink, gradient, graffiti, graffitipaint, graffitistyle, graffitiwall,
hallobat, halloween, harrypotter, ice-logo, infoff, jeff, lava-logo,
legendabv, legendasaiu, lid, lider, ligatures, likeff, list, lolavatar,
mascote, mascotemetal, mascoteneon, mata, me, mention, menualt, menubn,
menupets, metal, metallic, meustatus, mm, mp4, multicolor, myvip, naruto,
neon, neon-logo, neon2, neonglow, neonmetalic, neonparty, newyear, norian,
off, perfilff, perfilpic, phlogo, playboy, pornhub, pubg, pubgavatar,
pubgvideo, qg, rainbow, rankativo, rankativos, rankinativo, responsavel,
retro, retro-logo, revelar, robloxcodes, role.alterar, role.confirmados,
role.criar, role.excluir, role.nvou, role.vou, roles, royal, shadowsky,
shipo, silver-logo, skate-name, smoke, stars, statusbot, statusgp, stickers,
stone3d, subdono, suic, suicidio, summerbeach, suporte, system, techstyle,
tecnologica, thor, tiger, titanium, topcmd, totalcmd, typography, vintage3d,
voltei, water-logo, watercolor, write, yt3v2, zipbot
```

### Notas
- Muitos `*-logo` / `fig*` / `neon*` / `graffiti*` são *estilos de sticker/logo*
  que provavelmente deviam gerar imagem — mas hoje só respondem "Uso:".
- `beijo`, `abraco`, `gif`, `instagram`, `tiktok`, `facebook`, `spotify`,
  `soundcloud`, `twitter`, `mediafire`, `gdrive` têm versões reais noutros
  comandos (sticker/fig, downloaders) — convém mapear/encaminhar em vez de
  criar do zero.
- `suic`, `suicidio`, `pornhub`, `playboy` → conteúdo sensível; tratar com cuidado.
- `afk`, `mention`, `roles`, `role.*`, `meustatus`, `statusbot` → provavelmente
  deviam ligar a funcionalidades que existem parcialmente noutros módulos.

## Como se corrige (padrão)

1. Criar/estender um case real em `src/bot/cases/*.js` (carrega ANTES de
   `stubs.js`, por ordem alfabética) — o stub com `onlyIfNew:true` cede lugar.
2. Ou apagar a linha do stub em `stubs.js` quando o comando não fizer sentido.
3. Testar com um script em `scripts/` + `npm test`.
