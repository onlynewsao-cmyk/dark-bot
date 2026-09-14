# Auditoria de lentidão e funcionalidade — DARK BOT

Data: 12/09/2026

## Adenda v7.53 TURBO-2 (14/09/2026) — pipeline medido: 83 ms → 1 ms

Bench `/tmp/bench753.js` (harness efémero, latências simuladas
Atlas 40 ms / groupMetadata 60 ms, grupo alugado, `.ping`):

| config | média 5 iterações |
|---|---|
| TTL off (comportamento v7.52 + stats fire-and-forget) | 41 ms |
| TTL off, antes do fire-and-forget | 83 ms |
| **TTL on (`HOTCACHE_TTL_MS=45000`, v7.53)** | **1 ms** |

O restante em produção é física (RTT do WhatsApp) + trabalho do
próprio comando + humanizer fast (~80–260 ms).

Mudanças v7.53:

1. `hotCache` TTL entre-mensagens (45 s, só em produção via
   `HOTCACHE_TTL_MS`; testes correm com TTL off = comportamento
   antigo). Docs via `Model.hydrate` (0 queries); sem hydrate,
   fallback direto. Invalidação cirúrgica: `rental2.js` ×4,
   `api.js` ×4.
2. `groupMetadata` começa antes do bloco rental (paralelo com
   as queries) — poupa até 60 ms nos comandos de grupo.
3. `incrementUserCommand` fire-and-forget (7 locais): as
   escritas de stats (User + GroupMemberActivity, até ~120 ms
   em série) já não bloqueiam a resposta.
4. `themeResolver` consulta `hotCache.peekGroup` antes do
   `GroupSettings.findOne` direto (0 ms com TTL).
5. Presets ffmpeg: `compressor` medium→fast / fast→veryfast,
   `nativeCommands` medium→fast + fast→veryfast (GIF),
   `ytdl` fast→veryfast (mesmo CRF = mesma qualidade).
6. `humanizer.pensando()` — heartbeat `composing` de 4 s para
   `rotearComIA` e `auraRespond` (o "a digitar…" já não morre
   em respostas longas da IA).
7. Mídia do menu (`menu_media_*`) em cache 10 min — era
   1 download de rede por comando de menu.

Testes: `test-turbo` 28/28 (9 asserts novos v7.53), vizinhos
verdes, `audit-publico` 1599/0, suite completa em validação.

## Adenda v7.52 TURBO (13/09/2026) — atrasos removidos, medidos em teste

Resposta à pergunta "o bot usa o potencial todo de 1 vCPU / 2 GB?": não usava.
Cada resposta pagava 1,1–6,3 s de atrasos artificiais (humanizer), cada
mensagem de grupo fazia ~8 queries ao Mongo (mesmos 2 docs repetidos),
cada download/conversão ffmpeg parava TODOS os chats (execSync até 4 min),
e o feed de estados entrava no pipeline completo sem ser tratado por nada.

Correcções (teste `test:turbo`, 19 asserts, na chain):

1. **Humanizer fast por omissão** — lido + "a escrever…" sem bloquear;
   espera mínima 80–260 ms (era 700–4500 ms só de escrita + 400–1800 ms
   de leitura). Medido: texto longo < 700 ms. `HUMANIZE=full` repõe o
   teatral; `HUMANIZE=off` desliga.
2. **hotCache** (`src/bot/hotCache.js`) — memo agarrado à mensagem:
   User + GroupSettings 1 query cada por mensagem, partilhada pelos 5
   handlers em voo único (era ~8 roundtrips). Sem partilha entre
   mensagens → zero dados velhos. Medido: 4 antis em paralelo → 1 query.
3. **ffmpeg/yt-dlp assíncronos** — `runYtDlp`, `extractAudio*`,
   `compress*`, `convertVideo*`, `processAudioEffect`, `_paraOpus`,
   `videoToWebp*`, `ffmpegExtractPngs`, `convertAnimatedToMp4`,
   `videoBufferToMp3`, espeak: tudo async/await. Tarefas pesadas já não
   congelam os outros chats. Bónus: `--concurrent-fragments 4` no yt-dlp;
   corrigido `compressImage` (devolvia Promise sem await → imagem quebrada).
4. **TTS em paralelo** — pedaços ElevenLabs (tecto 3) e gTTS (tecto 4)
   com ordem preservada.
5. **Skip de `status@broadcast`** no router antes de qualquer I/O.
6. **Paralelo por chat + tecto global 8** no router (ordem preservada
   dentro do chat; sem thrash em flood).
7. **Baileys**: `defaultQueryTimeoutMs` 60 s → 25 s,
   `retryRequestDelayMs` 500 ms → 250 ms (falhar rápido).
8. **Node para 2 GB**: `--max-old-space-size=1536`, `UV_THREADPOOL_SIZE=8`.
9. **curl Sync → fetch** no mediafire/liteapks (também fecha injecção
   de shell via URL).

Mantido de propósito (anti-ban): sem chamadas automáticas (v7.51),
sem rajadas de envio; jitter mínimo mantido.

## Resumo

O bot não está inútil: a suíte cobre 246 comandos catalogados, 93 comandos de download com handlers e os módulos principais carregam. Porém, existem caminhos que podem ser lentos por desenho e dependências externas que não podem ser garantidas pelo código sozinho.

## Validações executadas

- `npm test`: iniciou a suíte completa.
- Sintaxe: **215 ficheiros, 0 erros**.
- EJS: **32 templates, 0 erros**.
- Catálogo: **246 comandos, auditoria OK**.
- Auditoria de downloads: **93/93 handlers reais**.
- Cases de mídia: **19/19 OK**.
- AURA, permissões e menus: auditorias principais passaram.
- Duas falhas conhecidas em `test:menu18`: conversão imagem/GIF para WebP/figurinha por erro de módulo nativo `sharp` no ambiente de teste.
- Teste externo de download: providers públicos podem falhar, expirar ou ignorar qualidade; por isso há fallbacks e validação de bytes.

## Principais fontes de lentidão

### 1. Rede externa em série

Downloads e mídia passam por API SystemZone, yt-dlp, ytdl-core, youtubei.js e serviços de fallback, em sequência. Cada fallback possui timeout próprio; quando vários falham, o utilizador pode esperar dezenas de segundos.

Mitigação já existente: lazy-load dos módulos e fallbacks. Recomendação: usar yt-dlp + FFmpeg no container e limitar tentativas de fallback por comando.

### 2. AURA

A AURA pode consultar MongoDB, histórico, memória, regras e provider de IA antes de responder. Isso é funcional, mas naturalmente mais lento que um comando direto.

Para produção rápida:

```env
HUMANIZE=off
AUTO_CALL=off
```

### 3. Humanizador

Quando ativado, adiciona leitura, estado de escrita/gravação, atraso proporcional e jitter. É uma escolha de experiência, não um problema de infraestrutura.

### 4. WhatsApp/Baileys

O `.ping` mede o tempo da operação de envio/edição no WhatsApp, não apenas CPU do Northflank. Uma resposta de 2–4 segundos pode ocorrer mesmo com `/health` abaixo de 300 ms.

### 5. Conversão de mídia

FFmpeg, sharp e upload do ficheiro são operações CPU/memória. 512 MB pode ser suficiente para texto e áudio curto, mas 1 GB é mais seguro para vídeo/stickers.

## Problemas funcionais encontrados e corrigidos nesta linha

- Aliases duplicados entre `downloads.js`, `downloads2.js`, `online.js` e `extraCases.js` foram separados.
- Fallback yt-dlp ignorava bitrate de áudio e usava sempre 128K; passou a respeitar 96k/192k/320k.
- Fallback yt-dlp ignorava a resolução recebida e usava quase sempre 720p; passou a respeitar 360/720/1080.
- `loader.to` podia ignorar o bitrate; o áudio do fallback é normalizado pelo FFmpeg antes de ser enviado.
- Docker passou a instalar explicitamente `python3-pip`, `yt-dlp` e FFmpeg.
- Prefixo padrão alinhado com a documentação: `.`.

## Riscos que exigem atenção no deploy

1. O Dockerfile deve ser usado no Northflank; `npm ci` precisa executar scripts para preparar módulos nativos.
2. O MongoDB Atlas deve estar acessível pelos egress IPs do Northflank.
3. Providers externos podem retornar HTTP 429, vídeos indisponíveis ou URLs expiradas.
4. A qualidade recebida só pode ser garantida quando o provider/fallback entrega o ficheiro para conversão local; uma API externa pode limitar a fonte original.
5. Uma única instância é obrigatória para evitar duas sessões WhatsApp concorrentes.
6. Não usar chamadas VoIP automáticas no primeiro deploy.

## Configuração recomendada

```env
NODE_ENV=production
PORT=3000
HUMANIZE=off
AUTO_CALL=off
```

Northflank:

```text
Instances: 1
Health check: /health
Port: 3000
512 MB: texto/AURA leve
1024 MB: mídia, FFmpeg e stickers
```

## Critério de “funciona de verdade”

Um comando de mídia deve ser considerado funcional somente quando:

1. recebe uma URL ou pesquisa válida;
2. obtém bytes maiores que o mínimo;
3. valida o tipo de ficheiro;
4. respeita limite de duração/tamanho;
5. normaliza a qualidade quando necessário;
6. envia o buffer ao WhatsApp;
7. informa falha sem prometer entrega quando todos os providers falham.

Os testes estáticos confirmam handlers e contratos. A entrega real depende de rede, WhatsApp, providers, MongoDB e credenciais do ambiente de produção.
