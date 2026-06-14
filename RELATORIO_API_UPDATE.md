# 🕷️ RELATÓRIO — Atualização de APIs de Download (v4 — Junho 2026)

## ❌ Problema

YouTube bloqueia **todos os IPs de servidores/datacenters**. Quando o bot tenta baixar áudio/vídeo:
- **yt-dlp**: `"Sign in to confirm you're not a bot"` — bloqueado completamente
- **@distube/ytdl-core**: `"Failed to find any playable formats"` — sem acesso
- **YouTube InnerTube API**: Retorna `UNPLAYABLE` ou `LOGIN_REQUIRED` — sem stream URLs
- **loader.to**: Retorna URLs que redirecionam para **páginas de ads/HTML**, não arquivos de mídia
- **y2mate, yt1s, savetube, 9convert**: Todos offline (404/500)
- **Cobalt API oficial**: Requer JWT/ApiKey — instâncias comunitárias mortas
- **Piped API**: Todas instâncias retornam 502 ou DNS falhou
- **Invidious**: Todas instâncias retornam 403/502

## ✅ Solução Implementada: Cloudflare Worker Proxy

### Como funciona:
```
Bot (servidor) → Cloudflare Worker (IP limpo) → YouTube InnerTube API
                   ↓
              URLs de streaming diretas
                   ↓
Bot → googlevideo.com (CDP do Google) → Buffer MP3/MP4 → WhatsApp
```

1. O bot envia request para o **Cloudflare Worker** (que roda em IPs residenciais da Cloudflare)
2. O Worker faz chamada à **YouTube InnerTube API** (ANDROID client)
3. YouTube retorna **URLs de streaming diretas** (porque o IP é limpo)
4. O Worker retorna as URLs ao bot
5. O bot baixa o arquivo diretamente do **googlevideo.com** (CDP do Google, acessível de qualquer IP)

### Deploy (5 minutos, grátis):
1. Criar conta em [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (grátis)
2. `npm install -g wrangler && wrangler login`
3. `cd cloudflare-worker && wrangler deploy`
4. Configurar variável: `YT_PROXY_URL=https://dark-bot-yt-proxy.seu-usuario.workers.dev`

### APIs que AINDA funcionam (sem Worker):
| API | Serviço | Status |
|-----|---------|--------|
| tikwm.com | TikTok | ✅ Funciona |
| spotifydown.com | Spotify | ✅ Funciona |
| siputzx.my.id | Pinterest | ✅ Funciona |
| Cloudflare Worker | YouTube, Instagram, Facebook, Twitter, SoundCloud | ✅ Com deploy |

## 📁 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `cloudflare-worker/worker.js` | Novo — Worker que faz proxy de YouTube |
| `cloudflare-worker/wrangler.toml` | Novo — Config do Cloudflare |
| `cloudflare-worker/README.md` | Novo — Instruções de deploy |
| `src/bot/dl/helpers.js` | Adicionado `proxyYoutubeAudio`, `proxyYoutubeVideo`, `fetchMediaBuffer` |
| `src/bot/dl/social.js` | CF Worker como método principal |
| `src/bot/dl/others.js` | CF Worker social endpoint para Instagram/Facebook/Twitter |
| `src/bot/downloader.js` | Pipeline: CF Worker → loader.to → Cobalt → yt-dlp |
| `package.json` | Adicionado `youtubei.js`, `@distube/ytdl-core`, `linkedom` |

## 🔧 Variável de Ambiente

| Nome | Obrigatória | Descrição |
|------|-------------|-----------|
| `YT_PROXY_URL` | **Sim** (para YouTube) | URL do Cloudflare Worker |

Sem `YT_PROXY_URL`, o bot mostrará instruções para configurar o Worker quando alguém tentar baixar do YouTube.
