# DARK BOT — Contexto de trabalho local

Atualizado em 2026-08-26 após sincronização de `main`.

## Estado sincronizado

- Repositório: `https://github.com/onlynewsao-cmyk/dark-bot`
- Pasta local: `/home/user/dark-bot`
- Branch: `main`
- Commit atual: `f4a291b2daa551036f0947574b9b4a57ceae7c22` (`f4a291b fix: reativar AURA no PV e controlar spam`)
- Working tree limpo no momento da sincronização.
- 373 ficheiros versionados.
- Não foram copiados `.env`, sessões, credenciais ou chaves de runtime.

## Mapa mental da aplicação

### Arranque e infraestrutura

- `src/index.js`: bootstrap do Express, EJS, sessão, Socket.IO, MongoDB, rotas, health checks, auto-start do bot, scheduler e AURA proativa.
- `src/config.js`: normaliza variáveis de ambiente, números WhatsApp, limites, providers de IA, Cloudinary e MongoDB.
- `src/database/connection.js` + `src/database/migrate.js`: ligação e migração MongoDB.
- `src/database/models/`: 19 modelos para utilizadores, configurações de grupos, comandos, sessões, memória AURA, economia, RPG, pagamentos, logs e mídia.
- `src/bot/whatsapp.js`: Baileys principal, QR/pair-code, sessão persistente e reconexão.
- `src/bot/callSocket.js`, `callBot.js`/VoIP: ligação secundária isolada para chamadas.

### Fluxo de mensagens

1. Baileys recebe a mensagem.
2. `src/bot/messageListener.js` e `commandHandler.js` normalizam contexto, remetente, grupo, prefixo, cargos e limites.
3. Anti-link, anti-spam, anti-sticker e regras são aplicados.
4. Comandos são resolvidos por `caseHandler.js`, `nativeCommands.js`, packages e cases dinâmicos.
5. Mensagens sem comando podem seguir para AURA conforme modo, invocação, PV/grupo e permissões.
6. Respostas, mídia, reações e eventos são emitidos pelo socket e pelo `liveBroadcaster`.

### AURA

`src/aura/` contém personalidade/humor/histórico, memória por utilizador e grupo, interpretação de intenção, ações, regras aprendidas, sticker-ban, voz, mídia, canais, agenda, proatividade, modos e guardas contra instruções indevidas. A execução passa principalmente por `auraBrain`, `auraInterpret`, `auraExec`, `auraActions`, `auraModes` e `rulesEngine`.

### Funcionalidades de negócio

- `src/bot/cases/`: downloads, grupos, IA, economia, jogos, interações, áudio, logos, texto, pesquisa, stickers, premium e finalização.
- `src/bot/packages/`: comandos nativos agrupados para jogos, economia, família, interações e cheats administrativos.
- `src/bot/rpg/`: criação, engine, mundo, imagens e comunidades RPG.
- `src/decrypter/`: engine e formatos EHI, HAT, SSH, OpenVPN, WireGuard, NPv, NetMod, DarkTunnel, AnyTunnel, APNAlite, TLSTunnel, WyrVPN, JSON e texto.
- `src/routes/` + `src/views/`: login/registo, dashboard, APIs, ligação WhatsApp/VoIP, comandos, utilizadores, grupos, mídia, pagamentos, backup, estatísticas e controlo.
- `src/bot/stickerMaker.js`: conversão para WebP quadrado, GIF/vídeo animado, watermark e metadados de pack.
- `src/bot/portal18.js`: portal separado com controle de acesso, filtros e entrega privada.

## Validação executada

Ambiente: Node instalado no sandbox, dependências instaladas com `npm ci --ignore-scripts` e depois `npm rebuild sharp --foreground-scripts` para compilar os módulos nativos.

- `node scripts/check-syntax.js`: **202 ficheiros OK**
- `node scripts/check-ejs.js`: **31 templates OK**
- `node scripts/audit-commands.js`: **OK**
- `node scripts/audit-org-comandos.js`: **OK**; catálogo sem fantasmas/stubs
- `npm test`: **OK após reconstruir sharp**
- Auditoria MENU18: **32 OK / 0 falhas**
- `npm audit --omit=dev`: **9 vulnerabilidades** (1 moderada, 8 altas)

### Nota sobre o falso negativo inicial de stickers

O primeiro `npm test` falhou em duas verificações do `test:menu18` porque a instalação foi feita com `--ignore-scripts`; o `sharp` aninhado em `wa-sticker-formatter` ficou sem o binário nativo. Depois de executar `npm rebuild sharp --foreground-scripts`, a conversão de imagem e GIF passou. Em deploy, confirmar que os scripts de instalação das dependências nativas não estão desativados.

## Pontos de atenção para próximas alterações

1. **Metadados de versão:** `package.json` ainda declara `6.92.0`, embora o HEAD contenha commits posteriores (v6.95 e correções de AURA). Uniformizar apenas numa alteração deliberada de release.
2. **Configuração de produção:** `src/config.js` exporta `isProd`, enquanto `src/index.js` consulta `config.isProduction` em pontos de produção. Validar/corrigir essa inconsistência antes de depender do bloqueio obrigatório de MongoDB e dos cookies seguros.
3. **Dependências:** `sharp`, `wa-sticker-formatter` e `yt-search` aparecem como dependências diretas com alertas; há também vulnerabilidades transitivas em axios, file-type, image-size, minimatch, node-fzf e redstar. Atualizar incrementalmente, sem `npm audit fix --force` sem testes.
4. **Execução dinâmica:** existem `eval`/`child_process` em paths administrativos e no carregamento de cases. Preservar os gates de dono, os filtros de `caseHandler` e os testes de permissões; nunca expor isso à AURA/conversa.
5. **Runtime externo:** testes que consultam yande.re/e621/safebooru e providers de download podem falhar por rede/API, sem significar necessariamente regressão local.
6. **Segredos:** usar somente variáveis de ambiente. A credencial fornecida para autenticação não foi gravada no remote nem no código; como foi disponibilizada fora do GitHub, é prudente revogá-la e substituí-la por um token de escopo mínimo.
7. **Diagnóstico de mensagens:** `src/bot/whatsapp.js` agora regista o stack real quando `commandHandler` falha, em vez de esconder silenciosamente a rejeição. `src/config.js` também expõe `isProduction` como alias compatível de `isProd`, corrigindo o gate de produção do bootstrap.
8. **Play:** `src/bot/cases/downloads.js` e `src/bot/systemZeroPlay.js` receberam um card exclusivo Dark Tóxico apenas para `play`; os IDs continuam a disparar `ytd`/`gyt`. O fluxo de `play3` não foi alterado.
9. **Qualidade/performance de mídia:** `mediaQuality.js` centraliza perfis baixa/média/alta; `systemZeroPlay.ytAudio` e `ytVideo` agora encaminham bitrate/resolução para a API e para os fallbacks locais. O botão `ytd` passa corretamente a qualidade escolhida, evitando que todas as opções caiam em 128k.
10. **PV com LID:** mensagens privadas entregues como `remoteJid` `@lid` agora usam `remoteJidAlt`/`remoteJidPn` (`@s.whatsapp.net`) para o caminho de resposta quando disponível. Isso evita o caso em que o handler trata a mensagem, mas a entrega volta para um JID LID não aceite pela versão Baileys em produção.

## Procedimento padrão para futuras tarefas

```bash
cd /home/user/dark-bot
git pull --ff-only origin main
npm ci
npm test
```

Antes de mexer em produção: reproduzir com um teste isolado, alterar o menor bloco possível, executar sintaxe/EJS/auditorias relevantes e por fim a suíte completa. Para mudanças de MongoDB, WhatsApp, IA, Cloudinary ou VoIP, testar também com variáveis reais isoladas e nunca salvá-las no workspace.
