# Relatório do Workspace — DARK BOT

Data: 2026-06-09
Pasta principal: `dark-net`
Origem: GitHub público `onlynewsao-cmyk/dark-bot`

## Para que serve o projeto

O DARK BOT é um sistema de automação WhatsApp com dashboard web. Ele usa Node.js/Express, Socket.IO, MongoDB e Baileys para:

- Conectar o WhatsApp por QR Code ou Pair Code.
- Guardar sessão WhatsApp no MongoDB para sobreviver a reinícios do Render.
- Gerir dashboard com login, dono, usuários free/premium, mídia, comandos e pagamentos.
- Enviar broadcasts e mensagens agendadas.
- Criar stickers e processar mídia via Cloudinary.
- Usar IA opcional via Groq/Gemini.
- Decriptar alguns formatos de configs VPN no dashboard.

## Correções feitas

### Login do dashboard

- Corrigido suporte a proxy HTTPS do Render com `app.set('trust proxy', 1)` e sessão `secure: 'auto'`.
- Sessão agora é regenerada e salva antes de redirecionar para `/dashboard`.
- Seed/sync do usuário dono agora atualiza role, ativo, nome, número e senha a partir das variáveis do Render.
- Login e registro agora falham rapidamente com mensagem clara quando o MongoDB não está disponível.
- Variáveis de ambiente são normalizadas para remover aspas e entidades HTML como `&amp;` em URIs copiadas.

### QR Code e Pair Code

- Corrigida limpeza completa da sessão WhatsApp no MongoDB mesmo antes de `mongoAuth` estar carregado.
- Pair Code sempre inicia sessão fresca e valida número antes de chamar Baileys.
- QR Code no dashboard agora também pode forçar sessão nova (`fresh: true`).
- Frontend agora valida respostas HTTP, mostra erros reais e reativa botões quando algo falha.
- Pair Code deixou de ser impresso nos logs do servidor; aparece apenas no dashboard.
- Corrigido conflito crítico entre sessão web (`connect-mongo`) e sessão WhatsApp/Baileys: agora usam coleções separadas (`web_sessions` e `whatsapp_sessions`).

### Segurança

- Removida senha padrão real do código.
- Removidos arquivos grandes de player YouTube não usados.
- Removida chave Tenor hardcoded; agora usa `TENOR_API_KEY` opcional.
- Adicionado `.gitignore` para impedir commit de `.env`, sessões, logs e `node_modules`.
- Adicionado `.env.example` sem chaves reais.
- `res.locals.process.env` não expõe mais o ambiente completo às views.

### Render

- `render.yaml` atualizado para plano free, `npm ci --omit=dev`, `npm start`, `/health` e env vars com `sync: false` para segredos.
- `APP_URL`, dados públicos do bot/dono e `NODE_OPTIONS` foram alinhados.
- Em produção, MongoDB agora é obrigatório: se `MONGODB_URI` falhar, o app encerra com mensagem clara em vez de usar `MemoryStore` inseguro.

## Arquivos principais alterados

- `src/index.js`
- `src/config.js`
- `src/routes/auth.js`
- `src/routes/api.js`
- `src/routes/dashboard.js`
- `src/bot/whatsapp.js`
- `src/bot/ai.js`
- `src/bot/gifHelper.js`
- `src/views/dashboard/connect.ejs`
- `src/views/partials/head.ejs`
- `src/views/partials/footer.ejs`
- `src/public/js/app.js`
- `src/database/models/Session.js`
- `render.yaml`
- `package.json`
- `.gitignore`
- `.env.example`
- `scripts/check-syntax.js`
- `scripts/check-ejs.js`
- `scripts/smoke-local.js`
- `scripts/decrypt-url.js`

## Atualização via DARK-BOT-COMPLETO.txt

Foi importado o conteúdo do `DARK-BOT-COMPLETO.txt` do GitHub para os módulos centrais do bot, preservando as correções já feitas de Render/login/sessão/QR/Pair Code para não regredir produção.

Principais itens integrados:

- `buttonHandler` para botões/listas.
- `AntiStatus` e cache no `messageListener`.
- Novos/atualizados módulos de jogos, família, economia, cheats e `quizData`.
- Decrypter atualizado com `detectURI`, `blindDecrypt` e `brute`.
- `commandHandler` atualizado com leitura de botões/listas e auto-decrypt configurável.
- `nativeCommands` atualizado com menus/comandos v3, mantendo compatibilidade com o downloader existente.

Ajustes específicos pedidos:

- Quiz infinito com banco local de 1283 perguntas e integração direta com Gemini (`chatGemini`) para gerar perguntas inéditas quando `GEMINI_API_KEY` estiver configurada.
- GIFs nos comandos de interação, família e economia via `gifHelper`/Tenor; usa `TENOR_API_KEY` opcional no Render.
- Sticker a partir de vídeo/GIF com pipeline ffmpeg e limite de 13 segundos.
- Comandos por botões/listas com `buttonHandler` e leitura de respostas interativas no `commandHandler`.
- Decrypter aperfeiçoado: detecta extensão/conteúdo/URI/link MediaFire, tenta brute-force estrutural (`blindDecrypt` com score), usa wordlist comum nos parsers compatíveis, fallback forense e formatter mostrando SNI, proxy, payload completo, user, senha, porta, IP, bughost e estruturas como HTTP/TLS/HTTP Proxy/V2Ray/WireGuard/OpenVPN/Trojan/SS. Arquivos EHI binários protegidos agora são classificados como parcial/protegido sem falsos positivos de host.
- WhatsApp: `!decrypt <link MediaFire/direto>` baixa e analisa o arquivo, enviando resultado + JSON. Auto decrypt global pode ser ligado/desligado com `!autodecrypt on/off`.
- Dashboard: página VPN Decrypter aceita upload e link MediaFire/direto; Configurações ganhou multiprefixo e Auto Decrypt global.
- Multiprefixo real no handler: comandos aceitam prefixos configurados no dashboard ou por `!prefixos ! . # /`.
- Perfil do usuário agora é único por número WhatsApp; o bot não pergunta gênero automaticamente. `genero` mostra botões e `alterargenero` só permite troca 1x por dia.
- Admins de grupo podem bloquear/desbloquear comandos ou submenus por grupo (`bloquearcmd`, `desbloquearcmd`, `cmdsgrupo`); `menu` e `menubtn` escondem itens bloqueados.
- God Mod ADM para donos (`godmodoadm`) e controles ocultos em `maiscmds`, sem poluir o menu público do WhatsApp.
- Dashboard de grupos ganhou nome custom do bot por grupo e lista de comandos bloqueados. Dashboard de settings ganhou donos extras e God Mod ADM.
- Tratamento por gênero agora é aplicado em mensagens principais: homem → “meu Rei”, mulher → “minha Rainha”, outro/default → “meu nobre”; dono principal recebe tratamento especial de Criador Supremo.
- BotChat opcional (`botchat on/off` e dashboard) permite responder “oi/olá” de outros bots/menções com cooldown anti-loop.
- IA ficou mais robusta com timeouts curtos, fallback de modelos Groq/Gemini, fallback público filtrado e prompt do dashboard para evitar travar sem resposta.
- `play`, `play2`, `video`, `video2` mantêm APIs existentes e ganharam fallback `yt-dlp`; Pinterest foi corrigido para aceitar arrays da API funcional testada e agora envia uma grade de imagens em uma única mensagem para evitar bagunça.
- `vinil` agora gera vídeo circular/PTV estilo vídeo rápido do WhatsApp.
- Dashboard de mídias mostra se vídeo é normal ou circular/PTV.
- `figubug2` cria imagem via IA e transforma em sticker. Sticker de vídeo usa `ffmpeg-static`, melhor para Render.
- `menudono`, `panel` e cases owner-only adicionados. As “travas” foram implementadas como comandos seguros/simulados de diagnóstico owner-only, sem spam/crash/mensagens maliciosas.
- O download de músicas foi preservado em compatibilidade com a lógica existente (`youtubeAudio`, `play160`, `playMedium`, `play320`).
- Downloads de vídeo agora tentam garantir MP4: se o buffer baixado não for MP4, o bot converte localmente com `ffmpeg-static` antes de enviar ao WhatsApp; se a conversão local falhar, usa fallback por URL com `mimetype: video/mp4`.
- Chave Tenor hardcoded removida; usa `TENOR_API_KEY` opcional no Render.

## Testes executados

```bash
npm test
```

Resultado:

- Syntax OK: 69 arquivos JS.
- EJS OK: 29 templates.
- Smoke OK: `/health`, `/login`, redirecionamento de dashboard protegido e erro amigável sem MongoDB.
- Secret scan OK: nenhuma chave real gravada nos arquivos do workspace.

## Checklist para o Render

No painel do Render, confirme estas variáveis sem expor valores reais:

- `APP_URL`
- `NODE_ENV=production`
- `PORT=3000`
- `BOT_NAME`
- `BOT_NUMBER`
- `OWNER_NAME`
- `OWNER_NUMBER`
- `OWNER_USERNAME`
- `OWNER_PASSWORD`
- `SESSION_SECRET`
- `MONGODB_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `TENOR_API_KEY` opcional

Importante: no `MONGODB_URI`, use `&` normal, não `&amp;`. O código já tenta corrigir, mas o ideal é guardar certo no Render.

## Próximos passos

1. Fazer commit/push das alterações para o GitHub.
2. No Render, disparar Manual Deploy.
3. Abrir `/health` e confirmar `db: connected`.
4. Entrar em `/login` com o usuário dono configurado no Render.
5. Ir em `/dashboard/connect` e testar primeiro QR Code; se preferir, usar Pair Code com número em formato DDI+número, sem `+`.
