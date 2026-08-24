/**
 * DARK BOT v6.22 — RPG COMANDOS RICOS
 * Personagens, combate narrativo, guildas, quests com história
 */
'use strict';

const config = require('../../config');
const rpg = require('../rpg/engine');
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ═══ SISTEMA DE COOLDOWN / ENERGIA ═══
const _rpgCooldowns = new Map(); // key: senderNumber_action → timestamp

function checkCooldown(sender, action, seconds) {
  const key = sender + '_' + action;
  const last = _rpgCooldowns.get(key) || 0;
  const now = Date.now();
  const elapsed = (now - last) / 1000;
  if (elapsed < seconds) {
    const remaining = Math.ceil(seconds - elapsed);
    return { blocked: true, remaining };
  }
  _rpgCooldowns.set(key, now);
  return { blocked: false, remaining: 0 };
}

function cooldownMsg(action, remaining) {
  const emojis = { battle: '⚔️', quest: '📜', train: '🏋️', explore: '🗺️', craft: '🔨', default: '⏳' };
  const emoji = emojis[action] || emojis.default;
  const names = { battle: 'combate', quest: 'quest', train: 'treino', explore: 'exploração', craft: 'crafting', default: 'acção' };
  const name = names[action] || names.default;
  return emoji + ' *Cooldown:* Espera *' + remaining + 's* para próximo ' + name + '.\n💡 _Descansa um pouco, guerreiro._';
}

// Limpa cooldowns antigos a cada 10 min
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of _rpgCooldowns) {
    if (now - ts > 600000) _rpgCooldowns.delete(key);
  }
}, 600000);

// ═══ v6.87: SESSÃO DO GERADOR DE PERSONAGEM ═══
// Guarda a escolha em curso (raça → classe → confirmar) enquanto o
// jogador toca nos botões. Expira aos 10 min, como os cooldowns.
const _rpgSel = new Map(); // senderNumber → { nome, race, classe, ts }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rpgSel) {
    if (!v?.ts || now - v.ts > 600000) _rpgSel.delete(k);
  }
}, 600000).unref?.();


async function tReply(sock, msg, ctx, title, lines) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, title, lines, { botName: config.bot.name }) }, { quoted: msg });
}

module.exports = function registerRPG2(registerCase) {

  // ═══ CRIAR PERSONAGEM — v6.87: POR SELECÇÃO ═══
  //
  // ANTES: o comando mostrava a lista e mandava o jogador escrever
  // "!rpgstart Nome elfo mago" — mas os argumentos NUNCA eram lidos
  // (o nome ficava "Kira elfo mago") e `race`/`class` nem existiam no
  // schema do RPGPlayer, pelo que a ficha caía sempre no fallback
  // "humano guerreiro". Não havia maneira de ter uma raça.
  //
  // AGORA: !rpgstart abre botões (raça → classe → confirmar) e grava a
  // escolha. O modo de texto continua a funcionar para quem já o usava.
  registerCase(['criarpersonagem', 'newchar', 'rpgstart'], async ({ sock, msg, ctx, args, prefix }) => {
    const btn = require('../buttonHandler');
    const PE = require('../prefixEngine');
    const P = prefix || ctx.prefix || '!';
    const quem = ctx.senderNumber;

    // "caçador" (do jogador) == "cacador" (do motor)
    const chave = (s) => String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const procura = (mapa, valor) => {
      const v = chave(valor);
      if (!v) return null;
      return Object.keys(mapa).find(k => chave(k) === v) || null;
    };
    const acaso = (mapa) => Object.keys(mapa)[Math.floor(Math.random() * Object.keys(mapa).length)];

    const sel = _rpgSel.get(quem) || {};
    const guardar = () => { sel.ts = Date.now(); _rpgSel.set(quem, sel); };
    const idBtn = (sub, valor) => PE.makeButtonId('rpgstart', valor ? `${sub} ${valor}` : sub);

    // ── GRAVAR ─────────────────────────────────────────────
    async function criar({ nome, race, classe }) {
      const p = await rpg.getPlayer(quem);
      const primeiraVez = !p.raceBonusApplied;
      if (nome) p.name = String(nome).slice(0, 24);
      if (race) {
        p.race = race;
        // o bónus da raça entra UMA vez, na criação — repetir o
        // comando muda a raça mas não volta a somar stats
        if (primeiraVez) {
          const b = rpg.RACES[race]?.bonus || {};
          for (const s of ['str', 'dex', 'int', 'vit', 'luk']) {
            p.stats[s] = (p.stats[s] || 6) + (b[s] || 0);
          }
          p.raceBonusApplied = true;
        }
      }
      if (classe) p.class = classe;
      await rpg.savePlayer(p);
      return p;
    }

    async function ficha(p) {
      const race = rpg.RACES[p.race] || rpg.RACES.humano;
      const cls = rpg.CLASSES[p.class] || rpg.CLASSES.guerreiro;
      return tReply(sock, msg, ctx, `${race.emoji} ${String(p.name).toUpperCase()}`, [
        `🎭 *Personagem criado*`,
        '',
        `👤 Nome: *${p.name}*`,
        `🧬 Raça: *${p.race}* ${race.emoji}`,
        `⚔️ Classe: *${p.class}* ${cls.emoji}`,
        '',
        `⚔️ STR ${p.stats.str} · 🏃 DEX ${p.stats.dex} · 🔮 INT ${p.stats.int}`,
        `🛡️ VIT ${p.stats.vit} · 🍀 LUK ${p.stats.luk}`,
        '',
        `${race.emoji} ${race.desc}`,
        `${cls.emoji} ${cls.desc}`,
        '',
        `> Vê a ficha completa com *${P}rg*`,
      ]);
    }

    // ── PASSO 1: RAÇA ──────────────────────────────────────
    async function pedirRaca() {
      guardar();
      const linhas = Object.entries(rpg.RACES)
        .map(([k, v]) => `${v.emoji} *${k}* — ${v.desc}`);
      return btn.sendButtons(
        sock, ctx.remoteJid,
        `🎭 *CRIAR PERSONAGEM*\n\n👤 Nome: *${sel.nome || ctx.pushName || 'Aventureiro'}*\n\n🧬 *Escolhe a raça:*\n\n${linhas.join('\n')}`,
        `${P}rpgstart · passo 1/3`,
        [
          ...Object.keys(rpg.RACES).map(k => ({ id: idBtn('raça', k), text: `${rpg.RACES[k].emoji} ${k}` })),
          { id: idBtn('aleatorio'), text: '🎲 Aleatório' },
        ],
        msg,
      ).catch(() => tReply(sock, msg, ctx, '🎭 CRIAR PERSONAGEM', [
        '🧬 *RAÇAS:*', ...linhas, '', `> Usa: ${P}rpgstart <nome> <raça> <classe>`,
      ]));
    }

    // ── PASSO 2: CLASSE ────────────────────────────────────
    async function pedirClasse() {
      guardar();
      const race = rpg.RACES[sel.race];
      const linhas = Object.entries(rpg.CLASSES)
        .map(([k, v]) => `${v.emoji} *${k}* — ${v.desc}`);
      return btn.sendButtons(
        sock, ctx.remoteJid,
        `🎭 *CRIAR PERSONAGEM*\n\n🧬 Raça: *${sel.race}* ${race?.emoji || ''}\n\n⚔️ *Escolhe a classe:*\n\n${linhas.join('\n')}`,
        `${P}rpgstart · passo 2/3`,
        [
          ...Object.keys(rpg.CLASSES).map(k => ({ id: idBtn('classe', k), text: `${rpg.CLASSES[k].emoji} ${k}` })),
          { id: idBtn('aleatorio'), text: '🎲 Aleatório' },
        ],
        msg,
      ).catch(() => tReply(sock, msg, ctx, '🎭 CRIAR PERSONAGEM', [
        `🧬 Raça: *${sel.race}*`, '', '⚔️ *CLASSES:*', ...linhas, '',
        `> Usa: ${P}rpgstart classe <classe>`,
      ]));
    }

    // ── PASSO 3: CONFIRMAR ─────────────────────────────────
    async function pedirConfirmacao() {
      guardar();
      const race = rpg.RACES[sel.race];
      const cls = rpg.CLASSES[sel.classe];
      return btn.sendButtons(
        sock, ctx.remoteJid,
        `🎭 *CRIAR PERSONAGEM*\n\n👤 Nome: *${sel.nome || ctx.pushName || 'Aventureiro'}*\n` +
        `🧬 Raça: *${sel.race}* ${race?.emoji || ''}\n⚔️ Classe: *${sel.classe}* ${cls?.emoji || ''}\n\n` +
        `${race?.desc || ''}\n${cls?.desc || ''}`,
        `${P}rpgstart · passo 3/3`,
        [
          { id: idBtn('confirmar'), text: '✅ Criar' },
          { id: idBtn('raça'), text: '🧬 Outra raça' },
          { id: idBtn('cancelar'), text: '❌ Cancelar' },
        ],
        msg,
      ).catch(() => tReply(sock, msg, ctx, '🎭 CONFIRMAR', [
        `👤 ${sel.nome || ctx.pushName} · 🧬 ${sel.race} · ⚔️ ${sel.classe}`, '',
        `> Usa: ${P}rpgstart confirmar`,
      ]));
    }

    // ── MODO DE TEXTO (como era antes) ─────────────────────
    // "!rpgstart Kira elfo mago" continua a funcionar; o que mudou é
    // que agora a raça e a classe são mesmo guardadas.
    async function modoTexto() {
      let race = null, classe = null;
      const nomeParts = [];
      for (const parte of args) {
        const r = procura(rpg.RACES, parte);
        const c = procura(rpg.CLASSES, parte);
        if (r && !race) race = r;
        else if (c && !classe) classe = c;
        else nomeParts.push(parte);
      }
      const nome = nomeParts.join(' ').trim();

      // não reconheceu raça nenhuma → abre a selecção com o nome dado
      if (!race && !classe) {
        sel.nome = nome || sel.nome || ctx.pushName || 'Aventureiro';
        return pedirRaca();
      }
      sel.nome = nome || sel.nome || ctx.pushName || 'Aventureiro';
      sel.race = race || sel.race || 'humano';
      sel.classe = classe || sel.classe || 'guerreiro';
      guardar();
      const p = await criar({ nome: sel.nome, race: sel.race, classe: sel.classe });
      _rpgSel.delete(quem);
      return ficha(p);
    }

    // ── ROUTER ─────────────────────────────────────────────
    const sub = String(args[0] || '').toLowerCase();
    const ehSub = /^(ra[çc]a|classe|confirmar|confirm|cancelar|nome|aleat[óo]rio)$/.test(sub);

    // sem argumentos → começa a selecção
    if (!args.length) {
      sel.nome = sel.nome || ctx.pushName || 'Aventureiro';
      return pedirRaca();
    }
    // não é um passo da selecção → modo de texto
    if (!ehSub) return modoTexto();

    if (/^ra[çc]a$/.test(sub)) {
      const race = procura(rpg.RACES, args[1]);
      if (!race) return pedirRaca();          // "outra raça" ou inválida
      sel.race = race;
      return pedirClasse();
    }

    if (/^classe$/.test(sub)) {
      const classe = procura(rpg.CLASSES, args[1]);
      if (!classe) return pedirClasse();
      sel.classe = classe;
      return pedirConfirmacao();
    }

    if (/^nome$/.test(sub)) {
      const nome = args.slice(1).join(' ').trim().slice(0, 24);
      if (nome) sel.nome = nome;
      return pedirConfirmacao();
    }

    if (/^aleat/.test(sub)) {
      sel.race = sel.race || acaso(rpg.RACES);
      sel.classe = acaso(rpg.CLASSES);
      guardar();
      return pedirConfirmacao();
    }

    if (/^cancelar$/.test(sub)) {
      _rpgSel.delete(quem);
      return tReply(sock, msg, ctx, '❌ CRIAÇÃO CANCELADA', [
        'Nada foi alterado.', '', `> Quando quiseres: *${P}rpgstart*`,
      ]);
    }

    // confirmar
    sel.nome = sel.nome || ctx.pushName || 'Aventureiro';
    sel.race = sel.race || 'humano';
    sel.classe = sel.classe || 'guerreiro';
    const p = await criar({ nome: sel.nome, race: sel.race, classe: sel.classe });
    _rpgSel.delete(quem);
    return ficha(p);
  }, true);

  // ═══ PERFIL RPG COMPLETO ═══
  registerCase(['rg', 'ficha', 'perfilrpg'], async ({ sock, msg, ctx }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    const race = rpg.RACES[p.race] || rpg.RACES.humano;
    const cls = rpg.CLASSES[p.class] || rpg.CLASSES.guerreiro;
    const hpBar = '❤️'.repeat(Math.ceil(p.hp / p.maxHp * 10)) + '🖤'.repeat(10 - Math.ceil(p.hp / p.maxHp * 10));
    const mpBar = '💙'.repeat(Math.ceil(p.mp / p.maxMp * 10)) + '🖤'.repeat(10 - Math.ceil(p.mp / p.maxMp * 10));
    const xpPct = Math.floor(p.xp / p.xpNext * 100);

    await rpg.savePlayer(p);


    return tReply(sock, msg, ctx, `${race.emoji} ${p.name.toUpperCase()}`, [
      `${race.emoji} *${p.name}* — ${p.race} ${cls.emoji} ${p.class}`,
      `${p.title ? `🏅 ${p.title}` : ''}`,
      `📊 Nível *${p.level}* | XP: ${p.xp}/${p.xpNext} (${xpPct}%)`,
      '',
      `${hpBar} HP: ${p.hp}/${p.maxHp}`,
      `${mpBar} MP: ${p.mp}/${p.maxMp}`,
      '',
      `⚔️ STR: ${p.stats.str} | 🏃 DEX: ${p.stats.dex}`,
      `🔮 INT: ${p.stats.int} | 🛡️ VIT: ${p.stats.vit}`,
      `🍀 LUK: ${p.stats.luk}`,
      '',
      `💰 ${p.coins} coins | 🏦 ${p.bank} no banco`,
      `🎒 ${p.inventory.length} itens | 💀 ${p.deaths} mortes`,
      `⚔️ ${p.kills} kills | ⭐ ${p.reputation} rep`,
      `❤️ Vidas: ${'♥️'.repeat(p.lives)}${'🖤'.repeat(Math.max(0, 3 - p.lives))}`,
      p.guild ? `🏰 Guilda: *${p.guild}*` : '',
      p.quest?.current ? `📜 Quest: *${p.quest.current}*` : '',
    ].filter(Boolean));
  }, true);

  // ═══ QUEST NARRATIVA ═══
  registerCase(['quest', 'historia', 'aventura'], async ({ sock, msg, ctx, args }) => {
    const cd = checkCooldown(ctx.senderNumber, 'quest', 60);
    if (cd.blocked) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '⏳ COOLDOWN', [cooldownMsg('quest', cd.remaining)]);
    const p = await rpg.getPlayer(ctx.senderNumber);
    const questId = p.quest?.current || 'prologo';
    const quest = rpg.QUESTS.find(q => q.id === questId);

    if (!quest) {
      // Sem quest activa — dar nova
      p.quest = { current: 'prologo', step: 0, completed: p.quest?.completed || [] };
      const q = rpg.QUESTS[0];
      await rpg.savePlayer(p);

      return tReply(sock, msg, ctx, q.title, [
        `📖 Capítulo ${q.chapter}`,
        '',
        q.story,
        '',
        ...q.choices.map((c, i) => `${i + 1}️⃣ ${c.text}`),
        '',
        `> Escolhe: !quest 1 ou !quest 2`,
      ]);
    }

    // Se tem argumento, processar escolha
    const choiceIdx = parseInt(args[0]) - 1;
    if (choiceIdx >= 0 && quest.choices[choiceIdx]) {
      const choice = quest.choices[choiceIdx];
      const reward = choice.reward || {};
      let rewardText = [];
      if (reward.xp) { const leveled = rpg.addXP(p, reward.xp); rewardText.push(`⭐ +${reward.xp} XP${leveled ? ' → NÍVEL ' + p.level + '!' : ''}`); }
      if (reward.coins) { p.coins += reward.coins; rewardText.push(`💰 ${reward.coins > 0 ? '+' : ''}${reward.coins} coins`); }
      if (reward.item) { p.inventory.push(reward.item); rewardText.push(`🎒 +${reward.item}`); }
      if (reward.hp_cost) { p.hp = Math.max(1, p.hp - reward.hp_cost); rewardText.push(`❤️ -${reward.hp_cost} HP`); }
      if (reward.hp_restore) { p.hp = Math.min(p.maxHp, p.hp + reward.hp_restore); rewardText.push(`❤️ +${reward.hp_restore} HP`); }
      if (reward.title) { p.title = reward.title; rewardText.push(`🏅 Título: ${reward.title}`); }
      if (reward.faction) { p.faction = reward.faction; rewardText.push(`⚔️ Facção: ${reward.faction}`); }

      // Avançar para próxima quest
      p.quest.current = choice.next;
      const nextQuest = rpg.QUESTS.find(q => q.id === choice.next);

      const lines = [
        `✅ Escolha: *${choice.text}*`,
        ...rewardText,
      ];

      if (nextQuest) {
        lines.push('', '─'.repeat(20), '', nextQuest.story, '');
        lines.push(...nextQuest.choices.map((c, i) => `${i + 1}️⃣ ${c.text}`));
        lines.push('', `> Escolhe: !quest 1 ou !quest 2`);
      } else {
        lines.push('', '🎉 *Fim do capítulo!* Mais em breve...');
      }

      await rpg.savePlayer(p);


      return tReply(sock, msg, ctx, quest.title + ' → ' + (nextQuest?.title || 'FIM'), lines);
    }

    // Mostrar quest actual
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, quest.title, [
      `📖 Capítulo ${quest.chapter}`,
      '',
      quest.story,
      '',
      ...quest.choices.map((c, i) => `${i + 1}️⃣ ${c.text}`),
      '',
      `> Escolhe: !quest <número>`,
    ]);
  }, true);

  // ═══ COMBATE NARRATIVO ═══
  registerCase(['lutar', 'fight', 'combate'], async ({ sock, msg, ctx, args }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    if (p.hp <= 0) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '💀 MORTO', ['💀 Estás morto! Usa !descansar ou !poção']);
    if (p.lives <= 0) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '💀 SEM VIDAS', ['💀 Sem vidas! Espera respawn ou usa !reviver']);

    const enemyType = args[0] === 'boss' ? 'boss' : args[0] === 'elite' ? 'elite' : 'normal';
    const enemy = rpg.generateEnemy(p.level + R(-1, 2), enemyType);

    // Combate por turnos (simplificado — 3 rounds)
    const rounds = [];
    let pHp = p.hp;
    let eHp = enemy.hp;

    for (let i = 0; i < 5; i++) {
      if (pHp <= 0 || eHp <= 0) break;
      // Jogador ataca
      const skills = ['basic', 'heavy', 'magic'];
      const pSkill = P(skills);
      const pAtk = rpg.calcDamage(p, enemy, pSkill);
      eHp -= pAtk.dmg;
      rounds.push(`${pAtk.crit ? '💥 CRÍTICO!' : '⚔️'} ${p.name} usa *${pSkill}* → ${pAtk.dmg} dmg`);

      if (eHp <= 0) break;

      // Inimigo ataca
      const eAtk = rpg.calcDamage(enemy, p, 'basic');
      pHp -= eAtk.dmg;
      rounds.push(`${eAtk.crit ? '💥' : '🗡️'} ${enemy.name} ataca → ${eAtk.dmg} dmg`);
    }

    p.hp = Math.max(0, pHp);
    const win = eHp <= 0;

    if (win) {
      const loot = R(10, 50) * (enemyType === 'boss' ? 10 : enemyType === 'elite' ? 3 : 1);
      const xp = R(20, 60) * (enemyType === 'boss' ? 5 : enemyType === 'elite' ? 2 : 1);
      p.coins += loot;
      p.kills++;
      const leveled = rpg.addXP(p, xp);
      const items = enemyType === 'boss' ? ['💎 Gema Lendária'] : enemyType === 'elite' && Math.random() < 0.3 ? ['⚔️ Arma Rara'] : [];
      items.forEach(i => p.inventory.push(i));

      await rpg.savePlayer(p);


      return tReply(sock, msg, ctx, `⚔️ VITÓRIA vs ${enemy.name}`, [
        `⚔️ *${enemy.name}* (Nv.${enemy.level}) DERROTADO!`,
        '',
        ...rounds,
        '',
        `💰 +${loot} coins | ⭐ +${xp} XP`,
        ...items.map(i => `🎒 +${i}`),
        leveled ? `🎉 *NÍVEL ${p.level}!*` : '',
        `❤️ HP: ${p.hp}/${p.maxHp}`,
      ].filter(Boolean));
    }

    // Derrota
    p.deaths++;
    p.lives = Math.max(0, p.lives - 1);
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, `💀 DERROTA vs ${enemy.name}`, [
      `💀 *${enemy.name}* venceu!`,
      '',
      ...rounds,
      '',
      `❤️ HP: ${p.hp}/${p.maxHp}`,
      `♥️ Vidas: ${p.lives}/3`,
      p.lives <= 0 ? '⚠️ *SEM VIDAS!* Usa !reviver ou espera 1h' : '',
    ].filter(Boolean));
  }, true);

  // ═══ EXPLORAÇÃO NARRATIVA ═══
  registerCase(['explorar', 'explore'], async ({ sock, msg, ctx, args }) => {
    const cd = checkCooldown(ctx.senderNumber, 'explore', 45);
    if (cd.blocked) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '⏳ COOLDOWN', [cooldownMsg('explore', cd.remaining)]);
    const p = await rpg.getPlayer(ctx.senderNumber);
    const biomeKey = args[0]?.toLowerCase() || P(Object.keys(rpg.BIOMES));
    const biome = rpg.BIOMES[biomeKey] || rpg.BIOMES.floresta;

    const events = [
      { text: `Encontras um ${P(['baú antigo', 'cofre escondido', 'saco de coins'])}!`, coins: R(10, 50) * biome.danger, xp: R(5, 20) },
      { text: `Um ${P(['lobo', 'goblin', 'esqueleto', 'bandido'])} aparece!`, combat: true },
      { text: `Encontras ${P(NPCS).name.split(',')[0]}!`, npc: true },
      { text: `Descobres uma ${P(['erva rara', 'pedra preciosa', 'relíquia antiga'])}!`, item: P(['erva medicinal', 'pedra preciosa', 'amuleto antigo']), xp: R(10, 30) },
      { text: `Paisagem deslumbrante. ${biome.desc}`, xp: R(5, 15), hp_restore: R(5, 15) },
      { text: `Cais numa armadilha!`, hp_cost: R(5, 15) * biome.danger, xp: R(5, 10) },
    ];

    // Biomas perigosos têm mais combates
    const event = biome.danger >= 3 && Math.random() < 0.5 ? events[1] : P(events);
    const lines = [`${biome.emoji} *${biomeKey.toUpperCase()}* — Perigo: ${'⚠️'.repeat(biome.danger)}`, '', event.text];

    if (event.coins) { p.coins += event.coins; lines.push(`💰 +${event.coins} coins`); }
    if (event.xp) { const lv = rpg.addXP(p, event.xp); lines.push(`⭐ +${event.xp} XP${lv ? ' → NÍVEL ' + p.level : ''}`); }
    if (event.item) { p.inventory.push(event.item); lines.push(`🎒 +${event.item}`); }
    if (event.hp_cost) { p.hp = Math.max(0, p.hp - event.hp_cost); lines.push(`❤️ -${event.hp_cost} HP`); }
    if (event.hp_restore) { p.hp = Math.min(p.maxHp, p.hp + event.hp_restore); lines.push(`❤️ +${event.hp_restore} HP`); }
    if (event.combat) { lines.push('', '> Usa !lutar para combater!'); }
    if (event.npc) { const npc = P(Object.values(rpg.NPCS)); lines.push('', `${npc.emoji} *${npc.name}*:`, `"${P(npc.dialogues)}"`); }

    await rpg.savePlayer(p);


    return tReply(sock, msg, ctx, `${biome.emoji} EXPLORAR`, lines);
  }, true);

  // ═══ DESCANSAR ═══
  registerCase(['descansar', 'rest'], async ({ sock, msg, ctx }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '🛏️ DESCANSAR', [
      '🛏️ Descansaste na taverna.',
      `❤️ HP: ${p.hp}/${p.maxHp} | 💙 MP: ${p.mp}/${p.maxMp}`,
    ]);
  }, true);

  // ═══ POÇÃO ═══
  registerCase(['pocao', 'potion'], async ({ sock, msg, ctx, args }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf('poção de vida');
    if (idx === -1) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '🧪 POÇÃO', ['❌ Sem poções! Compra no mercador.']);
    p.inventory.splice(idx, 1);
    p.hp = Math.min(p.maxHp, p.hp + 50);
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '🧪 POÇÃO', [`🧪 +50 HP! ❤️ ${p.hp}/${p.maxHp}`]);
  }, true);

  // ═══ REVIVER ═══
  registerCase(['reviver', 'revive'], async ({ sock, msg, ctx }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    if (p.lives > 0) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '💫 REVIVER', ['❌ Ainda tens vidas!']);
    if (p.coins < 500) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '💫 REVIVER', ['❌ Precisas de 500 coins para reviver']);
    p.coins -= 500;
    p.lives = 3;
    p.hp = p.maxHp;
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '💫 REVIVER', ['💫 Reviveste! ♥️♥️♥️ | -500 coins']);
  }, true);

  // ═══ GUILDA ═══
  registerCase(['guilda', 'guild', 'criarguilda'], async ({ sock, msg, ctx, args }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    if (args[0] === 'criar') {
      const name = args.slice(1).join(' ');
      if (!name || name.length > 20) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '🏰 GUILDA', ['Uso: !guilda criar <nome>']);
      if (p.guild) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '🏰 GUILDA', [`❌ Já estás na guilda ${p.guild}`]);
      if (p.coins < 1000) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '🏰 GUILDA', ['❌ Precisas de 1000 coins']);
      p.coins -= 1000;
      p.guild = name;
      p.title = 'Fundador';
      await rpg.savePlayer(p);

      return tReply(sock, msg, ctx, '🏰 GUILDA CRIADA', [
        `🏰 *${name}* fundada por *${p.name}*!`,
        `👑 Título: Fundador`,
        `💰 -1000 coins`,
      ]);
    }
    if (p.guild) {
      await rpg.savePlayer(p);

      return tReply(sock, msg, ctx, '🏰 ' + p.guild.toUpperCase(), [
        `👑 ${p.name} — ${p.title || 'Membro'}`,
        `> Usa !guilda info para ver detalhes`,
      ]);
    }
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '🏰 GUILDA', [
      'Sem guilda.',
      '> !guilda criar <nome> (1000 coins)',
      '> !guilda entrar <nome>',
    ]);
  }, true);

  // ═══ RANKING RPG ═══
  registerCase(['rankrpg', 'toprpg', 'rankglobal'], async ({ sock, msg, ctx }) => {
    // v6.62: `rpg._players` não existe no engine v7 (é `_cache`), e
    // havia um savePlayer(p) com `p` inexistente. Além disso o `if`
    // sem chavetas fazia o return correr SEMPRE — o ranking nunca
    // aparecia, mesmo com jogadores.
    const fonte = rpg._cache || rpg._players || new Map();
    const sorted = [...fonte.entries()]
      .sort((a, b) => (b[1]?.level || 0) - (a[1]?.level || 0) || (b[1]?.kills || 0) - (a[1]?.kills || 0))
      .slice(0, 10);
    if (!sorted.length) {
      return tReply(sock, msg, ctx, '🏆 RANKING', ['🏆 Sem jogadores ainda!']);
    }
    const lines = sorted.map(([id, p], i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} *${p.name}* — Nv.${p.level} ⚔️${p.kills} 💀${p.deaths}`;
    });
    // v6.62: o `p` aqui era o do .map() acima, já fora de escopo.
    // Um ranking não grava nada — só lista.

    return tReply(sock, msg, ctx, '🏆 RANKING RPG', lines);
  }, true);

  // ═══ INVENTÁRIO ═══
  registerCase(['inventario', 'inv', 'bau'], async ({ sock, msg, ctx }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    // v6.62: `p.inventory` podia ser undefined, e o `if` sem chavetas
    // fazia o return correr SEMPRE — o inventário nunca aparecia.
    if (!p || !Array.isArray(p.inventory) || !p.inventory.length) {
      return tReply(sock, msg, ctx, '🎒 INVENTÁRIO', ['🎒 Vazio!']);
    }
    const counts = {};
    p.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
    const lines = Object.entries(counts).map(([k, v]) => `• ${k} x${v}`);
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '🎒 INVENTÁRIO', lines);
  }, true);

  // ═══ LOJA ═══

  // ═══ TRABALHAR (narrativo) ═══

  // ═══ NPC INTERACTION ═══
  registerCase(['npc', 'falar', 'talk'], async ({ sock, msg, ctx, args }) => {
    const npcKey = args[0]?.toLowerCase() || P(Object.keys(rpg.NPCS));
    const npc = rpg.NPCS[npcKey] || P(Object.values(rpg.NPCS));
    // v6.62: savePlayer(p) com `p` inexistente — este comando só mostra.

    return tReply(sock, msg, ctx, `${npc.emoji} ${npc.name}`, [
      `"${P(npc.dialogues)}"`,
      '',
      `> NPCs: ${Object.keys(rpg.NPCS).join(', ')}`,
    ]);
  }, true);

  // ═══ BIOMAS (ver mapa) ═══
  registerCase(['mapa', 'biomas', 'world'], async ({ sock, msg, ctx }) => {
    const lines = Object.entries(rpg.BIOMES).map(([k, v]) =>
      `${v.emoji} *${k}* — ${'⚠️'.repeat(v.danger)} ${v.desc}`
    );
    // v6.62: savePlayer(p) com `p` inexistente — este comando só mostra.

    return tReply(sock, msg, ctx, '🗺️ MAPA DO MUNDO', lines);
  }, true);

  // ═══ STATUS / VIDAS ═══
  registerCase(['vidas', 'lives', 'status'], async ({ sock, msg, ctx }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '❤️ STATUS', [
      `❤️ HP: ${p.hp}/${p.maxHp}`,
      `💙 MP: ${p.mp}/${p.maxMp}`,
      `♥️ Vidas: ${'♥️'.repeat(p.lives)}${'🖤'.repeat(Math.max(0, 3 - p.lives))}`,
      `💀 Mortes: ${p.deaths} | ⚔️ Kills: ${p.kills}`,
      `⭐ Reputação: ${p.reputation}`,
    ]);
  }, true);

  // ═══ CLASSE & RAÇA INFO ═══
  registerCase(['racas', 'classes', 'rpginfo'], async ({ sock, msg, ctx }) => {
    const races = Object.entries(rpg.RACES).map(([k, v]) => `${v.emoji} *${k}* — STR+${v.bonus.str} DEX+${v.bonus.dex} INT+${v.bonus.int} VIT+${v.bonus.vit} LUK+${v.bonus.luk}`).join('\n');
    const classes = Object.entries(rpg.CLASSES).map(([k, v]) => `${v.emoji} *${k}* (${v.primary})`).join('\n');
    // v6.62: havia um `await rpg.savePlayer(p)` aqui com `p` inexistente.
    // Este comando só MOSTRA informação — não há nada para gravar.

    return tReply(sock, msg, ctx, '📖 INFO RPG', ['🧬 RAÇAS:', races, '', '⚔️ CLASSES:', classes]);
  }, true);

  // ═══ NOME RPG ═══
  registerCase(['nome', 'rename'], async ({ sock, msg, ctx, args }) => {
    const name = args.join(' ').trim();
    if (!name || name.length > 20) await rpg.savePlayer(p);
 return tReply(sock, msg, ctx, '📝 NOME', ['Uso: !nome <nome>']);
    const p = await rpg.getPlayer(ctx.senderNumber);
    p.name = name;
    await rpg.savePlayer(p);

    return tReply(sock, msg, ctx, '📝 NOME', [`✅ Nome: *${name}*`]);
  }, true);
};
