# Relatório de verificação — DARK BOT

**Repositório:** `onlynewsao-cmyk/dark-bot`  
**Revisão analisada:** `f9b0d95`  
**Data:** 22 de agosto de 2026

## Estrutura compreendida

- `src/index.js`: arranque da aplicação Express, dashboard e serviços do bot.
- `src/config.js`: configuração por variáveis de ambiente.
- `src/bot/` (113 ficheiros): ligação WhatsApp/Baileys, roteamento e catálogo de comandos, anti-spam/anti-link, IA, download, stickers, RPG, chamadas, temas e gestão de utilizadores.
- `src/aura/` (28 ficheiros): AURA — interpretação de intenção, memória, modos, conversação, voz, agenda e acções WhatsApp.
- `src/database/` (20 ficheiros): MongoDB, migração e modelos para utilizadores, sessões, comandos, economia, RPG, grupos e auditoria.
- `src/routes/` e `src/views/`: API, autenticação e dashboard EJS.
- `src/decrypter/` (20 ficheiros): motor e formatos de descodificação suportados.
- `scripts/`: verificações unitárias, integração simulada e auditorias funcionais.

## Validação executada, de cima para baixo

1. Dependências instaladas com `npm ci`.
2. Foram executados individualmente todos os **62 comandos `test:*`** declarados no `package.json`.
3. O único erro inicial foi `test:menu18`: o binário nativo `sharp` não tinha sido compilado porque a instalação foi feita com `--ignore-scripts`.
4. Foi executado `npm rebuild sharp`; em seguida `test:menu18` passou com **32/32** verificações.
5. A suite oficial completa `npm test` foi executada e terminou com sucesso (`exit code 0`). Ela também inclui a auditoria do catálogo de **279 comandos registados**.
6. As verificações estáticas passaram: **191 ficheiros JavaScript** sem erro de sintaxe e **30 templates EJS** válidos.

## Resultado

| Área | Resultado |
|---|---|
| Todos os scripts `test:*` do package | Aprovados após recompilar `sharp` |
| `npm test` | Aprovado |
| Sintaxe JS | 191/191 aprovados |
| Templates EJS | 30/30 aprovados |
| Catálogo de comandos | 279 comandos; auditoria aprovada |
| Menu 18+ | 32/32 após correcção do ambiente nativo |

## Questões encontradas

### Ambiente

- `sharp` requer o seu binário nativo. Não é falha do código: ocorreu porque os scripts de instalação foram explicitamente ignorados. Em instalação normal, usar `npm ci` (sem `--ignore-scripts`).
- Nos testes que tentam voz sem configuração externa, o sistema usou correctamente fallback de texto; também foi reportado que `espeak` não está instalado no ambiente de teste.

### Dependências — atenção de segurança

`npm audit --omit=dev` identificou **9 vulnerabilidades transitivas**: 1 moderada e 8 altas. As principais cadeias afectam `axios`, `sharp`, `wa-sticker-formatter`, `yt-search`/`node-fzf`, `file-type`, `image-size` e `minimatch`.

Não foi aplicado `npm audit fix --force`, para não introduzir alterações incompatíveis sem uma revisão específica. Recomenda-se uma actualização controlada das dependências e nova execução integral da suite depois da actualização.

## Segredos

Nenhuma chave foi gravada, exibida neste relatório ou usada para autenticação. Uma chave de acesso recebida fora do repositório deve ser **revogada e recriada**, pois foi partilhada em texto simples.
