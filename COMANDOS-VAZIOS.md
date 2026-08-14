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
