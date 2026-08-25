# Auditoria inicial — DARK BOT

Data: 2026-08-25
Origem: https://github.com/onlynewsao-cmyk/dark-bot
Branch sincronizada: `main`
Commit verificado: `e142210`

## Estado do workspace

- Repositório clonado integralmente em `/home/user/dark-bot`.
- 351 ficheiros versionados.
- Working tree limpo após a clonagem.
- Dependências instaladas com `npm ci`.
- Node syntax check de `src/index.js` e `src/config.js`: OK.

## Arquitetura compreendida

- `src/index.js`: arranque do Express, dashboard, Socket.IO, rotas, health checks e auto-start.
- `src/bot/whatsapp.js`: conexão Baileys, QR/pair-code e persistência/reconexão da sessão.
- `src/bot/commandHandler.js`: pipeline de mensagens, permissões, AURA e regras.
- `src/bot/caseHandler.js` e `src/bot/cases/`: catálogo de aproximadamente 1.870 comandos.
- `src/aura/`: módulos de memória, personalidade, humor, proatividade, voz, regras e sticker-ban.
- `src/bot/rpg/`: RPG, comunidades, economia, combate e estado do mundo.
- `src/routes/` e `src/views/`: dashboard web e APIs.
- `src/database/models/`: modelos MongoDB.
- `src/decrypter/`: Dark Net Engine para múltiplos formatos.
- `scripts/`: auditorias, simuladores, testes unitários, integração e smoke tests.

## Validação

`npm test` foi executado. A maioria das auditorias passou, incluindo sintaxe, EJS, comandos, permissões, AURA, menus, RPG e regras. O processo terminou com 2 falhas em `test:menu18`:

1. conversão de imagem para WebP/figurinha;
2. conversão de GIF para figurinha animada.

A mensagem observada foi `Something went wrong installing the "sharp" module`. O `require('sharp')` funciona diretamente no ambiente após `npm ci`, indicando falha dependente do fluxo/teste de conversão ou do ambiente nativo, e não erro de sintaxe. Deve ser investigada antes de deploy.

## Riscos identificados

- `npm audit --omit=dev`: 9 vulnerabilidades (1 moderada, 8 altas), envolvendo `axios`, `file-type`, `image-size`, `minimatch` e `sharp`, sobretudo por dependências transitivas. Não executar `npm audit fix --force` sem validar as alterações, pois propõe upgrades breaking.
- O token do GitHub fornecido para a clonagem foi usado apenas para autenticação e não foi gravado no remote nem em ficheiros do repositório. Como foi exposto no chat/anexo, deve ser revogado e substituído no GitHub.
- Não foram copiados `.env` ou credenciais de runtime para o workspace.

## Próximos passos recomendados

1. Revogar o token exposto e criar um novo com escopo mínimo.
2. Reproduzir e corrigir os dois testes de conversão WebP/GIF.
3. Atualizar dependências vulneráveis de forma incremental, começando por `sharp` e `wa-sticker-formatter`, com a suíte completa após cada alteração.
4. Validar com variáveis reais isoladas: MongoDB, IA, Cloudinary, voz e Baileys, sem colocar segredos no repositório.
5. Antes de deploy, executar smoke/diagnóstico e confirmar health checks `/ping`, `/health` e `/diag`.
