# DARK BOT — links permitidos e aviso próprio

Patch de 16/09/2026 sobre `c9ddb87`.

## Regra aplicada

O anti-link nativo não apaga nem penaliza uma mensagem composta apenas por links permitidos. São permitidos por padrão os domínios de YouTube, Facebook, Kwai, Threads, Spotify, TikTok, Twitter/X e Instagram listados em `src/bot/linkPolicy.js`, incluindo subdomínios legítimos e aliases como `youtu.be`, `fb.watch`, `kw.ai`, `spotify.link` e `t.co`.

A lista adicional de cada grupo (`antilinkWhitelist`) continua disponível. A comparação usa o hostname real, nunca a ocorrência de uma palavra no texto:

- `www.youtube.com` passa;
- `youtube.com.evil.org` não herda a permissão;
- `youtube.com@evil.org` num URL aponta para evil.org, não para YouTube;
- `evil.org/?next=https://youtube.com` não herda a permissão;
- link permitido + link proibido na mesma mensagem: o permitido não isenta o proibido.

No WhatsApp, a moderação apaga a mensagem inteira, não apenas parte do texto. Por isso uma mensagem mista pode ser removida quando um dos seus links infringe a regra.

Os modos mantêm-se: `wa` limita a detecção a convites/links WhatsApp reconhecidos; `smart` usa as categorias existentes; `all` detecta os restantes links, sempre descontando os permitidos. Não houve activação/desactivação automática do anti-link em nenhum grupo.

## Mensagem nova — exemplo de aviso

```text
🛡️ DARK BOT · ESCUDO DE LINKS

@participante, detectei link fora das permissões deste grupo.

✅ Permitidos: YouTube, Facebook, Kwai, Threads, Spotify, TikTok, Twitter/X e Instagram.

🗑️ Mensagem apagada.
⚠️ Aviso 1/2. Ao atingir o limite, a regra do grupo prevê remoção.

Partilha conteúdo permitido e mantém a conversa aberta. 🌙
```

O texto adapta-se à operação efectiva: não afirma apagamento se este falhar ou estiver desligado; só anuncia remoção de participante após resposta de sucesso do WhatsApp. Não reproduz o URL proibido. O modo `delete` continua silencioso e `notify off` continua sem avisos.

## Gestão no grupo

Usar o prefixo activo:

- `!antilink whitelist list`: mostra as plataformas base e os domínios adicionais.
- `!antilink whitelist add example.org`: autoriza o domínio adicional e seus subdomínios.
- `!antilink whitelist del example.org`: retira a entrada adicional.

Retirar um domínio da lista adicional não retira as permissões base das plataformas. O comando explica isso quando aplicável.

## Limites e compatibilidade

- Domínio permitido não significa conteúdo verificado ou seguro. A verificação é local por hostname: não segue redireccionamentos de encurtadores nem valida o destino final.
- Links com aliases que não estejam na lista podem ser adicionados pela administração após confirmação da origem.
- Preservados: imunidade do dono/admins/bot, comandos prefixados, opção de imunidade VIP, exigência de o bot ser admin, avisos, estatísticas e opt-out do grupo.
- Outros mecanismos de moderação (por exemplo, flood ou divulgação oculta) permanecem independentes. Esta alteração não controla outro bot que esteja no mesmo grupo.
- Nenhuma migração, chave ou ligação WhatsApp real foi necessária para preparar o patch.

## Validação

**97 verificações novas** em `npm run test:antilinkallowed`: plataformas nos três modos, subdomínios, ofuscação, domínios falsos, mensagens mistas, whitelist extra, ausência de penalizações para links permitidos, textos de aviso, falhas de apagamento/kick e permissões.

Passaram **12 scripts seleccionados**: `antilinkallowed`, `syntax`, `ejs`, `commands`, `e2e`, `auracontextual`, `auradelivery`, `roles`, `antitipos`, `incoming`, `selecao` e `admin-dono`. Sintaxe: 229 JS. `git diff --check` passou. Não foi executada a suite completa nem validado o deploy em produção.

Logs locais: `/home/user/revisao-dark-bot/antilink-*.log`.
