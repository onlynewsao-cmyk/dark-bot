# AURA — entrega para revisão

**Data da autorização de publicação:** 22/10/2026\
**Branch de destino:** `fix/aura-conversation-2026-10-22`\
**Base:** `9cf54d14ab68e9d7e1c5a964ab219c28cab17e1c`

Esta entrega reúne as duas rondas de correcções e melhorias da AURA: contexto e mensagens citadas, seguimentos de conversa, cancelamento de gerações ultrapassadas, fila, histórico, isolamento de caches, identidade do Dono, voz e as correcções de segurança documentadas.

## Escopo da publicação

- Código, testes e documentação das melhorias existentes, numa branch separada para revisão.
- Sem merge na `main` e sem executar deploy no Northflank.
- Sem integração do site solicitado para conteúdo sexualmente explícito. A alternativa de busca de cosplay sugerida na conversa também não foi implementada nesta entrega.
- Sem incluir ZIPs de entrega, `node_modules`, `.env` real, tokens, sessões, bases de dados ou alterações de permissões preexistentes nos scripts de RPG/média.

Os relatórios de 18/10 são registos históricos da validação local, anteriores à autorização de push. As indicações «sem commit/push» nesses relatórios descrevem o estado naquele momento, não o estado posterior desta branch.

## Validação antes da publicação

As dependências foram reinstaladas com lifecycle scripts desactivados e a validação offline seleccionada foi repetida:

- 26/26 scripts passaram;
- 541/541 verificações JavaScript e 37/37 templates EJS passaram;
- mantidos 1.423 cenários linguísticos derivados de modelos de frases;
- `git diff --check` sem erros.

Evidência: [`push-2026-10-22/validation-results.json`](push-2026-10-22/validation-results.json).

Reproduzir, com as dependências aprovadas instaladas:

```bash
python3 scripts/run-fixes-validation.py --output docs/push-2026-10-22
```

## Referências e limites

- [Primeira ronda: correcções e limites](AURA_FIXES_2026-10-18.md)
- [Segunda ronda: contexto e cancelamento](AURA_IMPROVEMENTS_2026-10-18.md)

Não foram usados providers, MongoDB ou contas WhatsApp reais, nem foi validado o serviço Northflank. A publicação da branch não afirma que o bot online esteja actualizado. A integração e o deploy precisam de revisão/autorização próprias.

O audit de produção histórico continua a registar 18 entradas (0 críticas, 11 altas e 7 moderadas); não foi repetido nesta entrega. Não há certificação de todos os bugs resolvidos ou da qualidade de respostas com modelos reais. Credenciais anteriormente expostas no histórico precisam de rotação fora deste commit; limpar exemplos não as revoga.
