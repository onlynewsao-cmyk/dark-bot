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
