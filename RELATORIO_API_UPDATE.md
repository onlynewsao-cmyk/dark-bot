# 🕸️ DARK BOT — Relatório de Atualização de APIs de Download

**Data:** 13/06/2026  
**Commit:** `3415a1d` → `main`  
**Repositório:** https://github.com/onlynewsao-cmyk/dark-bot

---

## 📋 Resumo

Todas as APIs de download quebradas/instáveis foram substituídas por APIs funcionais e atualizadas para 2025/2026. O projeto agora usa uma estratégia em camadas para máxima confiabilidade.

---

## ❌ APIs Removidas (Offline/Instáveis)

| API | Status | Problema |
|-----|--------|----------|
| `api.princetechn.com` | ❌ Offline | API principal completamente fora do ar |
| Todos os endpoints `?apikey=prince` | ❌ Inacessíveis | Sem resposta do servidor |

---

## ✅ APIs Adicionadas (Funcionais 2025/2026)

| API | Plataformas | Tipo | Auth |
|-----|-------------|------|------|
| **Cobalt API** (`api.cobalt.tools`) | YouTube, TikTok, Instagram, Facebook, Twitter/X, SoundCloud, Pinterest, Reddit | Open-source, multi-plataforma | Nenhuma |
| **TikWM** (`tikwm.com/api`) | TikTok | Sem marca d'água, alta qualidade | Nenhuma |
| **SpotifyDown** (`api.spotifydown.com`) | Spotify | Download MP3 direto | Nenhuma |
| **Siputzx** (`api.siputzx.my.id`) | Pinterest | Download + Pesquisa de imagens | Nenhuma |
| **yt-dlp** (local) | Todas as plataformas | Primário, sem dependência externa | Nenhuma |
| **ytdl-core** (npm) | YouTube | Fallback local (OPCIONAL) | Nenhuma |

---

## 🏗️ Estratégia em Camadas (por plataforma)

### YouTube (play, play2, play3, video, video2)
1. **yt-dlp** local → baixa + ffmpeg converte → Buffer MP3/MP4 direto
2. **Cobalt API** → URL de download
3. **ytdl-core** (se instalado) → URL do formato

### TikTok
1. **TikWM API** → sem marca d'água, URL direta
2. **Cobalt API** → fallback
3. **yt-dlp** → último recurso

### Instagram
1. **Cobalt API** → suporta Reels, Posts, Stories
2. **APIs alternativas** (saveig, igram) → fallback
3. **yt-dlp** → último recurso

### Facebook
1. **Cobalt API** → URL de download
2. **APIs alternativas** (fdown) → fallback
3. **yt-dlp** → último recurso

### Twitter/X
1. **Cobalt API** → URL de download
2. **APIs alternativas** (twitsave) → fallback
3. **yt-dlp** → último recurso

### Spotify
1. **SpotifyDown API** → MP3 direto com metadados
2. **Cobalt API** (modo áudio) → fallback
3. **YouTube search** → último recurso (busca mesma música)

### SoundCloud
1. **Cobalt API** (modo áudio) → URL/stream
2. **yt-dlp** → fallback direto
3. **YouTube search** → último recurso

### Pinterest
1. **Siputzx API** → download/pesquisa específica
2. **Cobalt API** → fallback
3. **Bing Images** → último recurso para pesquisa

---

## 📁 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/bot/dl/helpers.js` | Removido Prince API; adicionado Cobalt, TikWM, SpotifyDown, Siputzx; ytdl-core opcional |
| `src/bot/dl/social.js` | Substituídos todos os endpoints Prince por Cobalt + APIs funcionais |
| `src/bot/dl/others.js` | Substituídos todos os endpoints Prince por APIs específicas por plataforma |
| `src/bot/downloader.js` | Adicionados fallbacks de API (Cobalt, TikWM, SpotifyDown, Siputzx) quando yt-dlp falha |
| `src/bot/mediaHandler.js` | Adicionado `fetchJsonPost()` para chamadas POST com headers customizados |

---

## 🔧 Funções do Bot (por comando)

### 📥 Downloads
| Comando | Função | Status |
|---------|--------|--------|
| `!play` | YouTube áudio 96kbps | ✅ yt-dlp → Cobalt → ytdl-core |
| `!play2` | YouTube áudio 160kbps | ✅ yt-dlp → Cobalt → ytdl-core |
| `!play3` | YouTube áudio 320kbps | ✅ yt-dlp → Cobalt → ytdl-core |
| `!video` | YouTube vídeo 720p | ✅ yt-dlp → Cobalt → ytdl-core |
| `!video2` | YouTube vídeo 1080p | ✅ yt-dlp → Cobalt → ytdl-core |
| `!tiktok` | TikTok sem marca d'água | ✅ TikWM → Cobalt → yt-dlp |
| `!instagram` | Instagram Reels/Posts | ✅ Cobalt → APIs alt → yt-dlp |
| `!fb` | Facebook vídeo | ✅ Cobalt → fdown → yt-dlp |
| `!twitter` | X/Twitter vídeo | ✅ Cobalt → twitsave → yt-dlp |
| `!spotify` | Spotify MP3 | ✅ SpotifyDown → Cobalt → YouTube |
| `!soundcloud` | SoundCloud áudio | ✅ Cobalt → yt-dlp → YouTube |
| `!pinterest` | Pinterest imagens/vídeos | ✅ Siputzx → Cobalt → Bing |
| `!mediafire` | MediaFire direto | ✅ Scrape da página |
| `!apk` | MOD APKs | ✅ LiteAPKs + APKPure |
| `!vinil` | Disco vinil animado | ✅ yt-dlp + ffmpeg |

### 🧠 IA
| Comando | Função | Status |
|---------|--------|--------|
| `!ia` | Chat com IA (Gemini) | ✅ Funcional |
| `!deepsearch` | Pesquisa profunda | ✅ Funcional |
| `!imagem` | Gera imagem com IA | ✅ Funcional |
| `!figura` | Gera sticker com IA | ✅ Funcional |

### 🎨 Stickers
| Comando | Função | Status |
|---------|--------|--------|
| `!sticker` | Foto/vídeo → sticker | ✅ Funcional |
| `!figubug` | Sticker lendário | ✅ Funcional |
| `!figubug2` | Sticker IA | ✅ Funcional |
| `!toimg` | Sticker → imagem | ✅ Funcional |
| `!attp` | Texto animado | ✅ popcat.xyz API |
| `!ttp` | Texto em sticker | ✅ popcat.xyz API |

### 👥 Grupos
| Comando | Função | Status |
|---------|--------|--------|
| `!ban` | Banir membro | ✅ Funcional |
| `!promote` | Promover a admin | ✅ Funcional |
| `!demote` | Rebaixar admin | ✅ Funcional |
| `!open/close` | Abrir/fechar grupo | ✅ Funcional |
| `!todos` | Marcar todos | ✅ Funcional |
| `!antistatus` | Anti-status on/off | ✅ Funcional |
| `!antilink` | Anti-link on/off | ✅ Funcional |

### 🔓 VPN Decrypter
| Comando | Função | Status |
|---------|--------|--------|
| `!decrypt` | Decifrar config VPN | ✅ 20+ formatos suportados |
| `!vpn` | Alias para decrypt | ✅ Funcional |
| `!autodecrypt` | Auto-decrypt on/off | ✅ Funcional |

### 👑 Dono
| Comando | Função | Status |
|---------|--------|--------|
| `!panel` | Painel de controle | ✅ Funcional |
| `!broadcast` | Transmissão para grupos | ✅ Funcional |
| `!stats` | Estatísticas do bot | ✅ Funcional |
| `!setpremium` | Definir premium | ✅ Funcional |
| `!restart` | Reiniciar bot | ✅ Funcional |
| `!eval` | Executar JavaScript | ✅ Funcional |
| `!shell` | Executar comando shell | ✅ Funcional |

### 🎮 Jogos & Diversão
| Comando | Função | Status |
|---------|--------|--------|
| `!blackjack` | 21/Jogo de cartas | ✅ Funcional |
| `!quiz` | Quiz de perguntas | ✅ Funcional |
| `!forca` | Jogo da forca | ✅ Funcional |
| `!russa` | Roleta russa | ✅ Funcional |
| `!casal` | Casal do dia | ✅ Funcional |
| `!gay` | % gay aleatório | ✅ Funcional |
| `!roleta` | Sorteio aleatório | ✅ Funcional |

---

## 🚀 Como Fazer Deploy

### Opção 1: Render (recomendado)
1. Acesse [render.com](https://render.com)
2. Conecte o repositório GitHub
3. Configure:
   - **Build Command:** `npm install && pip install yt-dlp`
   - **Start Command:** `node src/index.js`
   - **Environment Variables:**
     - `MONGODB_URI` = sua string do MongoDB
     - `GEMINI_API_KEY` = chave do Google Gemini
     - `SESSION_SECRET` = segredo qualquer
     - `APP_URL` = URL do Render

### Opção 2: VPS (DigitalOcean, Hetzner, etc.)
```bash
git clone https://github.com/onlynewsao-cmyk/dark-bot.git
cd dark-bot
npm install
pip3 install yt-dlp
cp .env.example .env  # preencha as variáveis
node src/index.js
```

### Opção 3: Railway
1. Acesse [railway.app](https://railway.app)
2. Conecte o repositório
3. Adicione MongoDB como service
4. Configure as env vars

---

## ⚠️ Notas Importantes

1. **yt-dlp é o primário** — todas as APIs externas são FALLBACK. Se yt-dlp estiver instalado e funcional, ele será usado primeiro.

2. **Cobalt API pode ter rate limits** — se muitas requisições, pode ser necessário self-host (https://github.com/imputnet/cobalt).

3. **@distube/ytdl-core é OPCIONAL** — se quiser adicionar mais um fallback local:
   ```bash
   npm install @distube/ytdl-core
   ```

4. **Spotify download** funciona via SpotifyDown para links diretos. Para buscas por nome, o bot usa YouTube como fallback.

5. **O token do GitHub** que você compartilhou já foi usado para fazer o push. Recomendo **revogar esse token** por segurança e criar um novo se precisar de acesso contínuo.

---

*Gerado por Dark Net Engine 🕸️ — 13/06/2026*
