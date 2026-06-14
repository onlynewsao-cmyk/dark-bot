# 🕷️ Dark Bot - YouTube Proxy Worker

Este Cloudflare Worker resolve o problema de download do YouTube em servidores.

## 🔧 Por que é necessário?

YouTube bloqueia IPs de servidores/datacenters. Quando o bot tenta baixar áudio/vídeo
diretamente, o YouTube retorna "Sign in to confirm you're not a bot" ou não fornece
as URLs de streaming.

O Cloudflare Worker roda nos IPs da Cloudflare (que YouTube não bloqueia), obtém as
URLs de streaming do YouTube e retorna ao bot. O bot depois baixa o arquivo
diretamente dos servidores CDN do Google (googlevideo.com), que são acessíveis de qualquer IP.

## 🚀 Deploy (5 minutos)

### 1. Criar conta Cloudflare (grátis)
- Acesse: https://dash.cloudflare.com/sign-up
- É gratuito, sem cartão de crédito

### 2. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 3. Fazer login
```bash
wrangler login
```

### 4. Deploy do Worker
```bash
cd cloudflare-worker
wrangler deploy
```

### 5. Anotar a URL do Worker
Após o deploy, o Wrangler mostrará a URL, algo como:
```
Published dark-bot-yt-proxy (x.xx sec)
  https://dark-bot-yt-proxy.seu-usuario.workers.dev
```

### 6. Configurar no bot
Adicione a variável de ambiente no painel do Render ou no .env:
```
YT_PROXY_URL=https://dark-bot-yt-proxy.seu-usuario.workers.dev
```

## 📡 Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /audio?id=VIDEO_ID&quality=128` | URL de streaming de áudio |
| `GET /video?id=VIDEO_ID&quality=720` | URL de streaming de vídeo |
| `GET /info?id=VIDEO_ID` | Metadados do vídeo |
| `GET /search?q=QUERY` | Pesquisa no YouTube |
| `GET /social?url=URL` | Download de redes sociais (TikTok, Instagram, etc.) |
| `GET /health` | Verificação de status |

## 💰 Custo

**Gratuito** no plano Free da Cloudflare:
- 100.000 requests/dia
- Sem limite de bandwidth
- Sem cartão de crédito

## 🔒 Segurança

Para adicionar autenticação, configure uma API key:
```bash
wrangler secret put API_KEY
# Digite: sua-chave-secreta-aqui
```

Depois use `?key=sua-chave-secreta-aqui` nas requests ou header `X-API-Key`.
