<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&size=50&duration=2800&pause=500&color=8B5CF6&center=true&vCenter=true&multiline=true&width=900&height=140&lines=%E2%9A%A1+DARK+BOT+%E2%9A%A1;%F0%9F%A4%96+THE+ULTIMATE+WHATSAPP+BOT+%F0%9F%A4%96;%F0%9F%91%91+POWERED+BY+DARK+NET+%F0%9F%91%91" alt="DARK BOT" />

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=180&section=header&text=DARK%20BOT&fontSize=70&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Bot%20WhatsApp%20Profissional&descAlignY=58&descSize=20" />

<br/>

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=24&duration=2500&pause=800&color=06B6D4&center=true&vCenter=true&width=700&lines=%F0%9F%94%A5+Velocidade+que+impressiona;%E2%9A%A1+Poder+que+domina;%F0%9F%92%9C+Design+que+encanta;%F0%9F%91%91+Controle+total+do+Dono;%F0%9F%9A%80+Hospedado+24/7;%F0%9F%8C%99+The+Dark+Side+of+Automation)

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-ONLINE-8B5CF6?style=for-the-badge&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/OWNER-DARK%20NET-F59E0B?style=for-the-badge&logo=ghostery&logoColor=white" />
  <img src="https://img.shields.io/badge/VERSION-5.1.0-06B6D4?style=for-the-badge&logo=semver&logoColor=white" />
  <img src="https://img.shields.io/badge/LICENSE-PRIVATE-EF4444?style=for-the-badge&logo=lock&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Baileys-25D366?style=flat-square&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white" />
</p>

<br/>

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗  █████╗ ██████╗ ██╗  ██╗    ██████╗  ██████╗ ████████╗  ║
║   ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝    ██╔══██╗██╔═══██╗╚══██╔══╝  ║
║   ██║  ██║███████║██████╔╝█████╔╝     ██████╔╝██║   ██║   ██║     ║
║   ██║  ██║██╔══██║██╔══██╗██╔═██╗     ██╔══██╗██║   ██║   ██║     ║
║   ██████╔╝██║  ██║██║  ██║██║  ██╗    ██████╔╝╚██████╔╝   ██║     ║
║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝     ║
║                                                               ║
║              🤖  Where Code Meets the Dark Side  🌙           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

<br/>

</div>

---

## ✅ Estado técnico do Workspace

O projeto foi sincronizado na pasta `dark-net` e está preparado para Render sem guardar chaves reais no repositório.

**Para que serve:** o DARK BOT é um bot de WhatsApp com dashboard web para dono/usuários. Ele conecta via Baileys, responde comandos, cria stickers, gere usuários free/premium, faz broadcast, agenda mensagens, guarda sessão no MongoDB, hospeda mídia no Cloudinary, usa IA opcional (Groq/Gemini) e inclui ferramentas de decriptação de configurações VPN.

**Deploy:** configure as variáveis no painel do Render (`Environment`). Use `.env.example` apenas como referência; nunca publique `.env` real.

**Atualização v3:** módulos do `DARK-BOT-COMPLETO.txt` foram integrados no Workspace com correções de segurança. Inclui quiz infinito com 1283 perguntas + Gemini, GIFs em interações/família/economia, stickers de vídeo até 13s, comandos por botões com fallback, decrypter com brute-force/forense por arquivo/link MediaFire, multiprefixo configurável no dashboard, auto decrypt on/off, admins bloqueando comandos por grupo, donos extras, nome do bot por grupo, IA com timeouts e fallback Groq/Gemini, `figubug2`, `vinil` circular/PTV, Pinterest em grade e downloads YouTube com fallback yt-dlp. As travas do menu do dono são apenas simulações seguras owner-only, sem crash/spam.

**Testes locais:**

```bash
npm install
npm test
npm start
```

---

## 🚀 Novidades v5.1.0 (DarkShield Update)

**🛡️ DarkShield Anti-Link v2** — novo módulo dedicado `src/bot/antiLink.js`:

- Corrigido bug grave de fluxo (`goto_spam:`) que fazia o bot apagar/kickar mesmo sem ser admin
- Comandos do bot já não são apagados pelo anti-link (ex: `!ytd https://...`)
- Detecção de **links ofuscados**: `hxxp://`, `youtube [.] com`, `exemplo ponto com`, `wa [ponto] me`
- +30 encurtadores, Discord, Telegram, IPs directos, redes sociais
- Avisos progressivos com expiração automática (10 min)
- Estatísticas por grupo (apagados/avisos/kicks) persistidas no MongoDB
- Novos sub-comandos: `!antilink maxwarns`, `delete on|off`, `notify on|off`, `strict on|off`, `vip on|off`, `whitelist add|del|list`

**🔘 Motor de botões corrigido** — os botões agora renderizam e são clicáveis:

- Nova cascata: `interactive viewOnce + messageContextInfo + additionalNodes` → `ButtonV2 (MB.cjs)` → `direct` → texto
- Corrigido `patchMessageBeforeSending` (não re-envolve mensagens ButtonV2)
- `sendList`, `sendUrlButton`, `sendCopyButton` também com wrapper viewOnce

**🎵 play / play2 / play3 reescritos** com o formato de referência exacto:

- `systemZone.ytsearch()` → `resultados[]` (play = #1, play2 = #2, play3 = #3)
- Card ButtonV2 com thumbnail + botões **Baixar Áudio** (`!ytd`) / **Baixar Vídeo** (`!gyt`)
- Busca com fallback local (`yt-search`) quando a API falha
- Downloads com cadeia: SystemZone API → yt-dlp → @distube/ytdl-core → youtubei.js

**🖥️ Render Free:** build mais robusto (yt-dlp opcional via pip com fallback) e keep-alive duplo (interno + UptimeRobot em `/ping`).

---

**Rotas importantes:**

- `/health` — status do serviço, bot e MongoDB.
- `/login` — entrada no dashboard.
- `/dashboard/connect` — QR Code e Pair Code do WhatsApp.

---

<div align="center">

## 🌌 **Sobre o Projeto**

</div>

> 🔥 **DARK BOT** é mais que um bot — é uma **experiência completa de automação WhatsApp**, criada para quem busca **poder, elegância e controle absoluto**.

> 💜 Uma máquina silenciosa que trabalha 24/7 nas sombras, comandada por um dashboard moderno e profissional, projetado pixel a pixel pelo lendário **Dark Net**.

> ⚡ Imagine um bot que **conecta, responde, cria stickers, hospeda mídias e domina conversas** — tudo isso enquanto você toma café. **Bem-vindo ao lado escuro da automação.** 🌑

> 🚀 Da primeira mensagem ao último sticker, cada detalhe foi pensado para ser **rápido, bonito e indestrutível**. Não é só um bot — é uma **força da natureza digital**.

> 🎭 **Dois mundos, um sistema:** o Dono reina com poderes absolutos no painel, enquanto usuários Free e Premium navegam por experiências cuidadosamente desenhadas para cada nível.

> 🧠 **Inteligência sob medida:** comandos editáveis em tempo real, mídias hospedadas na nuvem, stickers com marca d'água exclusiva e um menu visual que parece mágica. Tudo personalizável. Tudo seu.

> 🌙 **DARK BOT não dorme.** Hospedado na nuvem, sempre online, sempre pronto. Quando o mundo descansa, ele continua respondendo.

> 👑 **Feito por um Dono, para Donos.** Se você é do tipo que não aceita menos que o extraordinário — você acabou de encontrar sua nova obsessão.

<br/>

<div align="center">

```diff
+ ⚡ Velocidade absurda     + 🎨 Design glassmorphism     + 🔐 Segurança militar
+ 🌐 Multi-usuário          + 💎 Sistema Premium          + 📦 Cloud-native
+ 🎯 Comandos dinâmicos     + 🖼️ Stickers exclusivos      + 👑 Controle total
```

</div>

---

<div align="center">

## 🎯 **O Que o DARK BOT Representa**

<table>
<tr>
<td align="center" width="33%">

### 🌑 **Poder**
Controle absoluto sobre cada interação. Cada comando, cada resposta, cada pixel — moldado pela sua vontade.

</td>
<td align="center" width="33%">

### 💎 **Elegância**
Um dashboard que parece arte digital. Tons de roxo profundo, gradientes que hipnotizam, animações sutis.

</td>
<td align="center" width="33%">

### ⚡ **Velocidade**
Respostas instantâneas. Conexão estável. Performance que faz outros bots parecerem lentos.

</td>
</tr>
<tr>
<td align="center">

### 🔮 **Mistério**
Trabalha nas sombras. Marca d'água em cada sticker. Sua assinatura digital invisível e onipresente.

</td>
<td align="center">

### 👑 **Autoridade**
O Dono manda. Os usuários obedecem. Hierarquia clara, permissões precisas, controle cirúrgico.

</td>
<td align="center">

### 🚀 **Futuro**
Construído com tecnologia de ponta. Escalável, modular, preparado para crescer junto com sua ambição.

</td>
</tr>
</table>

</div>

---

<div align="center">

## 🛠️ **Arsenal Tecnológico**

<table>
<tr>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="50"/><br/>Node.js</td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="50"/><br/>Express</td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" width="50"/><br/>MongoDB</td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/socketio/socketio-original.svg" width="50"/><br/>Socket.IO</td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/whatsapp/whatsapp-original.svg" width="50"/><br/>Baileys</td>
<td align="center"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="50"/><br/>JavaScript</td>
</tr>
</table>

</div>

---

<div align="center">

## 👑 **O Mestre por Trás das Sombras**

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=900&size=35&duration=3000&pause=1000&color=F59E0B&center=true&vCenter=true&width=600&lines=DARK+NET;%F0%9F%91%91+THE+OWNER+%F0%9F%91%91;ARCHITECT+OF+THE+DARK+SIDE" />

<br/><br/>

<table>
<tr>
<td align="center">

```
╔════════════════════════════╗
║   👑  D A R K  N E T  👑   ║
║                            ║
║   🌙  The Creator          ║
║   ⚡  The Mastermind       ║
║   🔮  The Visionary        ║
║                            ║
║   📞  +244 945 280 380     ║
╚════════════════════════════╝
```

</td>
</tr>
</table>

</div>

---

<div align="center">

## 📊 **Status do Sistema**

![Profile views](https://komarev.com/ghpvc/?username=darknet-bot&style=for-the-badge&color=8B5CF6&label=VISITAS)
![Maintained](https://img.shields.io/badge/MAINTAINED-YES-success?style=for-the-badge)
![Made with](https://img.shields.io/badge/MADE%20WITH-%E2%9C%A8%20DARK%20MAGIC-purple?style=for-the-badge)

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&text=%F0%9F%8C%99%20DARK%20BOT%20%E2%80%A2%20%F0%9F%91%91%20DARK%20NET%20%F0%9F%91%91&fontSize=22&fontColor=fff&animation=twinkling" />

<br/>

### ⚡ *"In darkness, we automate. In silence, we dominate."* ⚡

**`© 2026 DARK NET — All Rights Reserved`**

</div>
