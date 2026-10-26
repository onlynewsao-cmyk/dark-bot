# Render — correcção de recursão e porta no arranque

**Data:** 26/10/2026

**Base reproduzida:** `0e4401fa95c7e86aa207c3eee4b2d2c14db68024`

## Sintomas dos prints

O build termina, aparece «MongoDB conectado», mas surgem `Maximum call stack size exceeded`, avisos de listeners `promover` e «No open ports detected». O serviço fica à espera de uma resposta de `/health`.

## Causa encontrada e reproduzida

O ciclo era:

```text
getBot()
  → new WhatsAppBot()
    → sessionCenter.arrancarVigia()
      → _vigiarBotCaido()
        → getBot() antes de _instance receber o primeiro bot
```

Cada reentrada construía outro bot, registava mais listeners e iniciava mais trabalho de sessão. O Mongoose aparecia na pilha durante as operações repetidas; não se concluiu que a solução fosse trocar credenciais ou aumentar a RAM.

O novo teste executa o motor e o vigia reais com base de dados, sockets e timers simulados. Antes da correcção, falhou com **5 reentradas em vez de 1**; o teste limita a profundidade para não esgotar a pilha de propósito.

Havia também uma dependência desnecessária: `server.listen()` só era chamado depois de esperar pela reconexão WhatsApp.

## Alterações

- O construtor passa a inicializar apenas os campos do bot. `getBot()` publica a instância, associa o Socket.IO e só então inicia os monitores, uma única vez.
- O vigia de sessões regista a sua guarda/timers antes das chamadas que podem reentrar.
- O servidor passa a escutar explicitamente em `0.0.0.0` e na porta configurada antes de iniciar a reconexão WhatsApp.
- A reconexão guardada corre em segundo plano, sem bloquear os restantes serviços de arranque.
- `/health` e `/ping` deixam de passar pelo middleware de sessões e pelas quatro leituras de metadados da página.
- Se uma ligação for iniciada pelo dashboard enquanto a consulta de credenciais está pendente, o auto-start não a reinicia.

Não foram aumentados os limites de listeners para esconder o aviso. Não houve alteração das chaves, da URI MongoDB, do esquema das sessões ou reset de dados.

## Validação

| Runtime | Scripts seleccionados | JavaScript | EJS |
|---|---:|---:|---:|
| Node 20.20.2 | 30/30 | 543/543 | 37/37 |
| Node 22.23.4 | 30/30 | 543/543 | 37/37 |

Evidências:

- [Node 20](render-boot-2026-10-26/node20/validation-results.json)
- [Node 22](render-boot-2026-10-26/node22/validation-results.json)

As duas suites novas cobrem três cenários do singleton/vigia e dois cenários do bootstrap. O teste de bootstrap executa Express, HTTP e Socket.IO reais, num servidor temporário restrito a loopback, com MongoDB e WhatsApp simulados. Verifica `/health` e `/ping` enquanto `bot.start()` não termina, e a corrida com ligação manual pelo dashboard.

Incluídas também as regressões existentes da central de sessões e do pair code. Mantidos os 1.423 cenários linguísticos. `git diff --check` sem erros.

Os subprocessos de teste não recebem credenciais reais; rede externa, base de dados e processos filhos ficam bloqueados pelo guard. Algumas suites antigas fazem tentativas que o guard bloqueia; isso não certifica essas integrações. O guard não é uma sandbox de segurança. Não foram feitas ligações reais a MongoDB, WhatsApp ou providers.

Reproduzir o conjunto seleccionado:

```bash
python3 scripts/run-fixes-validation.py --output docs/render-boot-2026-10-26/recheck
```

Apenas as duas suites novas:

```bash
npm run test:render-startup
```

## Aplicar no Render

1. Manter a branch do serviço em `main`.
2. Depois da publicação desta revisão, usar **Manual Deploy → Deploy latest commit**. Não voltar a seleccionar o commit antigo `0e4401f` como revisão de destino.
3. Manter a porta configurada, `Health Check Path=/health` e o start command `npm start` ou `node src/index.js`.
4. Não é necessário alterar credenciais, limpar o MongoDB, apagar a sessão ou fazer novo emparelhamento só para aplicar esta correcção.
5. Confirmar nos logs que o servidor abre e que não há rajada de `RangeError` ou listeners `promover` duplicados.
6. O estado HTTP saudável não prova que o WhatsApp esteja conectado: confirmar também o estado do bot no painel e testar uma mensagem autorizada.

O deploy e a instância Render reais não foram operados nem verificados nesta validação. Os limites do plano Free e as restantes pendências dos relatórios anteriores continuam a aplicar-se; não se afirma que todos os bugs do projecto estejam resolvidos.
