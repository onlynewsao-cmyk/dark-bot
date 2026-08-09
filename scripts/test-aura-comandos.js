/**
 * DARK BOT — AURA executa comandos por conversa
 *
 * O pedido: "ela controla ~90% do bot, menos alguns de dono".
 *
 * Este teste garante as duas metades:
 *   1. EXECUTA o que deve   ("aura toca Shakira" → .play)
 *   2. NUNCA executa o que é perigoso (eval, broadcast, restart…)
 *
 * A segunda parte é a que interessa mesmo: um erro aqui é
 * irreversível em produção.
 *
 * Uso: node scripts/test-aura-comandos.js
 */
'use strict';

const path = require('path');
const C = require(path.join(__dirname, '..', 'src', 'aura', 'auraCommands'));

let ok = 0, fail = 0;
const check = (nome, cond, extra = '') => {
  cond ? ok++ : fail++;
  console.log(`  ${cond ? '✅' : '❌'} ${nome}${extra ? ' → ' + String(extra).slice(0, 60) : ''}`);
};

(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║      AURA — comandos por conversa (90% sim, dono não)             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // ══ 1. O QUE DEVE EXECUTAR ════════════════════════════════
  console.log('▸ Executa comandos normais');
  const devem = [
    ['aura toca Shakira', 'play', 'Shakira'],
    ['toca a música despacito', 'play', 'despacito'],
    ['põe música despacito', 'play', 'despacito'],
    ['faz sticker disto', 'sticker', ''],
    ['qual é o meu saldo?', 'saldo', ''],
    ['quero a recompensa diária', 'daily', ''],
    ['quem são os admins?', 'admins', ''],
    ['meu perfil', 'perfil', ''],
  ];
  const falharam = devem.filter(([t, cmd, args]) => {
    const r = C.detectarComando(t);
    return !r || r.comando !== cmd || (args && r.args !== args);
  });
  check('Detecta os pedidos comuns', falharam.length === 0,
    falharam.length ? falharam.map(f => f[0]).join(' | ') : `${devem.length}/${devem.length}`);

  // ══ 2. O QUE NUNCA PODE EXECUTAR ══════════════════════════
  console.log('\n▸ Comandos perigosos BLOQUEADOS (o que mais importa)');
  const perigosos = [
    'eval', 'exec', 'shell', 'broadcast', 'bc', 'send', 'sendgroup',
    'restart', 'shutdown', 'adddono', 'removedono', 'setpremium',
    'blacklist', 'unblacklist', 'block', 'addcase', 'delcase',
    'setprefix', 'backup', 'panel', 'bomb', 'fakeban', 'espiao',
    'adultmode', 'hentai', 'ximg', 'xvideo', 'fig18',
  ];
  const passaram = perigosos.filter(c => !C.estaBloqueado(c));
  check(`${perigosos.length} comandos perigosos bloqueados`, passaram.length === 0,
    passaram.length ? '⚠️ PASSARAM: ' + passaram.join(', ') : 'todos bloqueados');

  // ══ 3. Frases que mencionam comandos perigosos ════════════
  console.log('\n▸ Frases perigosas não viram comando');
  // "manda broadcast para todos" chegou a virar `.play broadcast`
  const frasesMas = [
    'manda broadcast para todos',
    'faz eval de 1+1',
    'reinicia o bot',
    'manda o hentai',
    'adiciona dono 123456',
    'põe o shell a correr',
  ];
  const viraram = frasesMas.filter(t => C.detectarComando(t) !== null);
  check('Nenhuma frase perigosa vira comando', viraram.length === 0,
    viraram.length ? viraram.join(' | ') : `${frasesMas.length}/${frasesMas.length}`);

  // ══ 4. Conversa normal continua conversa ══════════════════
  console.log('\n▸ Conversa normal não é comando');
  const conversa = ['oi tudo bem', 'me de um cavalo', 'como estás?', 'gosto muito de ti', 'bom dia'];
  const viraramCmd = conversa.filter(t => C.detectarComando(t) !== null);
  check('Conversa fica conversa', viraramCmd.length === 0,
    viraramCmd.length ? viraramCmd.join(' | ') : `${conversa.length}/${conversa.length}`);

  // ══ 5. Rede de segurança do catálogo ══════════════════════
  console.log('\n▸ Rede de segurança automática');
  // qualquer ownerOnly do catálogo que não esteja na lista manual
  let cobertos = 0, expostos = [];
  try {
    const cat = require(path.join(__dirname, '..', 'src', 'bot', 'commandCatalog'));
    const ownerOnly = (cat.CATALOG || []).filter(x => x.ownerOnly).map(x => x.name);
    const permitidos = new Set(['stats', 'donos', 'grupos', 'menudono', 'maiscmds']);
    for (const c of ownerOnly) {
      if (permitidos.has(c)) continue;
      C.estaBloqueado(c) ? cobertos++ : expostos.push(c);
    }
  } catch {}
  check('ownerOnly do catálogo cobertos', expostos.length === 0,
    expostos.length ? '⚠️ ' + expostos.join(', ') : `${cobertos} cobertos`);

  // ══ 6. Só o Dono (verificado no handler) ══════════════════
  console.log('\n▸ Restrito ao Dono');
  const ch = require('fs').readFileSync(
    path.join(__dirname, '..', 'src', 'bot', 'commandHandler.js'), 'utf8');
  check('Bloco de comandos exige isOwner',
    /if \(isOwner\) \{[\s\S]{0,300}auraCommands/.test(ch));
  check('Verifica estaBloqueado antes de correr',
    /estaBloqueado\(pedido\.comando\)/.test(ch));

  console.log(`\n  ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
