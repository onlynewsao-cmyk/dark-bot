/**
 * DARK BOT — Auditoria da AURA
 *
 * Verifica os problemas encontrados na revisão v6.44:
 *   1. Funções que rebentavam com argumentos em falta
 *   2. Mensagens de sistema ("❌ IA sem chave") a chegar ao utilizador
 *   3. Assistente com falas de robô / emojis
 *   4. Compreensão de linguagem natural (sem comandos)
 *   5. Memória persistente
 *
 * Uso: node scripts/test-aura-audit.js
 */
'use strict';

const path = require('path');
const AURA = path.join(__dirname, '..', 'src', 'aura');

let ok = 0, fail = 0;
const check = (nome, cond, extra = '') => {
  cond ? ok++ : fail++;
  console.log(`  ${cond ? '✅' : '❌'} ${nome}${extra ? ' → ' + extra : ''}`);
};

(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║            DARK BOT — AUDITORIA DA AURA                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // ── 1. Robustez das funções ────────────────────────────────
  console.log('▸ Funções não rebentam sem argumentos');
  const A = require(path.join(AURA, 'auraHuman'));
  const semSock = ['auraThinkOutLoud', 'auraFunFact', 'auraSingSong', 'auraIndirect', 'auraProactive'];
  for (const fn of semSock) {
    let sobreviveu = false;
    try { const r = await A[fn](); sobreviveu = r && r.success === false; } catch { sobreviveu = false; }
    check(`${fn}() devolve erro em vez de rebentar`, sobreviveu);
  }

  // ── 2. Funções puras devolvem valores válidos ──────────────
  console.log('\n▸ Funções de apoio');
  check('detectCountry(244…) = Angola', A.detectCountry('244945280380')?.code === 'AO');
  check('detectCountry(55…) = Brasil',  A.detectCountry('5511999998888')?.code === 'BR');
  check('detectDarkAttack detecta insulto', A.detectDarkAttack('o dark é um lixo') === true);
  check('detectDarkAttack ignora frase normal', A.detectDarkAttack('bom dia pessoal') === false);
  check('getMood devolve objecto', typeof A.getMood()?.mood === 'string');
  check('getDarkDefense devolve texto', String(A.getDarkDefense() || '').length > 5);
  check('loadPerson existe (memória persistente)', typeof A.loadPerson === 'function');

  // ── 3. Intenção em linguagem natural ───────────────────────
  console.log('\n▸ A AURA entende (sem comandos)');
  const I = require(path.join(AURA, 'auraIntent'));
  const O = { isOwner: true, isGroup: true, isReplyToBot: false };
  const casos = [
    ['aura, acorda', 'wake'], ['aura vem cá', 'wake'], ['aura volta a ser tu', 'wake'],
    ['aura, dorme', 'sleep'], ['aura sai daqui', 'sleep'], ['aura modo profissional', 'sleep'],
    ['aura tás aí?', 'status'],
    // ambíguos → não deve agir
    ['aura', null], ['que aura tu tens', null], ['mede minha aura', null],
    ['bom dia pessoal', null],
  ];
  for (const [txt, esp] of casos) {
    check(`"${txt}" → ${esp || 'nada'}`, I.detectAuraIntent(txt, O) === esp);
  }
  check('Membro não controla a AURA',
    I.detectAuraIntent('aura acorda', { isOwner: false, isGroup: true }) === null);
  check('No PV não há invocação (já está acordada)',
    I.detectAuraIntent('aura acorda', { isOwner: true, isGroup: false }) === null);

  // ── 4. Assistente não parece robô ──────────────────────────
  console.log('\n▸ Assistente fala como pessoa');
  const M = require(path.join(AURA, 'auraModes'));
  const prompt = M.buildAssistantPrompt({ botName: 'DARK BOT', userName: 'João', isGroup: true });
  check('Prompt proíbe "sou um assistente virtual"', /NUNCA digas/i.test(prompt));
  check('Prompt proíbe emojis', /SEM emojis/i.test(prompt));
  check('Prompt proíbe frases de call-center', /call-center/i.test(prompt));

  // fallback offline não deve ter emojis nem falas de robô
  const fb = M.assistantFallback('oi', { prefix: '.', botName: 'DARK BOT' });
  check('Fallback sem emoji', !/\p{Extended_Pictographic}/u.test(fb), JSON.stringify(fb.slice(0, 40)));
  check('Fallback sem "assistente virtual"', !/assistente virtual/i.test(fb));

  // ── 5. Mensagens de sistema nunca chegam ao utilizador ─────
  console.log('\n▸ Erros do motor não vazam para o chat');
  const src = require('fs').readFileSync(path.join(AURA, 'auraModes.js'), 'utf8');
  const src2 = require('fs').readFileSync(path.join(AURA, 'auraHuman.js'), 'utf8');
  check('auraModes filtra qualquer "❌"', /startsWith\('❌'\)/.test(src));
  check('auraHuman filtra qualquer "❌"', /startsWith\('❌'\)/.test(src2));

  // ── 6. Documentação honesta do código morto ────────────────
  console.log('\n▸ Código não utilizado está assinalado');
  check('Funções mortas têm aviso de auditoria', /NÃO são chamadas por/i.test(src2));

  console.log(`\n  ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
