/**
 * DARK BOT v6.22 — RPG COMANDOS RICOS
 * Personagens, combate narrativo, guildas, quests com história
 */
'use strict';

const config = require('../../config');
const rpg = require('../rpg/engine');
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

async function tReply(sock, msg, ctx, title, lines) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, title, lines, { botName: config.bot.name }) }, { quoted: msg });
}

module.exports = function registerRPG2(registerCase) {

  // ═══ CRIAR PERSONAGEM ═══
  registerCase(['criarpersonagem', 'newchar', 'rpgstart'], async ({ sock, msg, ctx, args }) => {
    const name = args.join(' ').trim() || ctx.pushName;
    const races = Object.entries(rpg.RACES).map(([k, v]) => `${v.emoji} *${k}* — ${v.desc}`).join('\n');
    const classes = Object.entries(rpg.CLASSES).map(([k, v]) => `${v.emoji} *${k}* — ${v.desc}`).join('\n');
    return tReply(sock, msg, ctx, '🎭 CRIAR PERSONAGEM', [
      `👤 Nome: *${name}*`,
      '',
      '🧬 *RAÇAS:*',
      races,
      '',
      '⚔️ *CLASSES:*',
      classes,
      '',
      `> Usa: !rpgstart ${name} <raça> <classe>`,
      `> Ex: !rpgstart ${name} elfo mago`,
    ]);
  }, true);

  // ═══ PERFIL RPG COMPLETO ═══
  registerCase(['rg', 'ficha', 'perfilrpg'], async ({ sock, msg, ctx }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    const race = rpg.RACES[p.race] || rpg.RACES.humano;
    const cls = rpg.CLASSES[p.class] || rpg.CLASSES.guerreiro;
    const hpBar = '❤️'.repeat(Math.ceil(p.hp / p.maxHp * 10)) + '🖤'.repeat(10 - Math.ceil(p.hp / p.maxHp * 10));
    const mpBar = '💙'.repeat(Math.ceil(p.mp / p.maxMp * 10)) + '🖤'.repeat(10 - Math.ceil(p.mp / p.maxMp * 10));
    const xpPct = Math.floor(p.xp / p.xpNext * 100);

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
    const p = rpg.getPlayer(ctx.senderNumber);
    const questId = p.quest?.current || 'prologo';
    const quest = rpg.QUESTS.find(q => q.id === questId);

    if (!quest) {
      // Sem quest activa — dar nova
      p.quest = { current: 'prologo', step: 0, completed: p.quest?.completed || [] };
      const q = rpg.QUESTS[0];
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

      return tReply(sock, msg, ctx, quest.title + ' → ' + (nextQuest?.title || 'FIM'), lines);
    }

    // Mostrar quest actual
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
    const p = rpg.getPlayer(ctx.senderNumber);
    if (p.hp <= 0) return tReply(sock, msg, ctx, '💀 MORTO', ['💀 Estás morto! Usa !descansar ou !poção']);
    if (p.lives <= 0) return tReply(sock, msg, ctx, '💀 SEM VIDAS', ['💀 Sem vidas! Espera respawn ou usa !reviver']);

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
    const p = rpg.getPlayer(ctx.senderNumber);
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

    return tReply(sock, msg, ctx, `${biome.emoji} EXPLORAR`, lines);
  }, true);

  // ═══ DESCANSAR ═══
  registerCase(['descansar', 'rest'], async ({ sock, msg, ctx }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    return tReply(sock, msg, ctx, '🛏️ DESCANSAR', [
      '🛏️ Descansaste na taverna.',
      `❤️ HP: ${p.hp}/${p.maxHp} | 💙 MP: ${p.mp}/${p.maxMp}`,
    ]);
  }, true);

  // ═══ POÇÃO ═══
  registerCase(['pocao', 'potion'], async ({ sock, msg, ctx, args }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    const idx = p.inventory.indexOf('poção de vida');
    if (idx === -1) return tReply(sock, msg, ctx, '🧪 POÇÃO', ['❌ Sem poções! Compra no mercador.']);
    p.inventory.splice(idx, 1);
    p.hp = Math.min(p.maxHp, p.hp + 50);
    return tReply(sock, msg, ctx, '🧪 POÇÃO', [`🧪 +50 HP! ❤️ ${p.hp}/${p.maxHp}`]);
  }, true);

  // ═══ REVIVER ═══
  registerCase(['reviver', 'revive'], async ({ sock, msg, ctx }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    if (p.lives > 0) return tReply(sock, msg, ctx, '💫 REVIVER', ['❌ Ainda tens vidas!']);
    if (p.coins < 500) return tReply(sock, msg, ctx, '💫 REVIVER', ['❌ Precisas de 500 coins para reviver']);
    p.coins -= 500;
    p.lives = 3;
    p.hp = p.maxHp;
    return tReply(sock, msg, ctx, '💫 REVIVER', ['💫 Reviveste! ♥️♥️♥️ | -500 coins']);
  }, true);

  // ═══ GUILDA ═══
  registerCase(['guilda', 'guild', 'criarguilda'], async ({ sock, msg, ctx, args }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    if (args[0] === 'criar') {
      const name = args.slice(1).join(' ');
      if (!name || name.length > 20) return tReply(sock, msg, ctx, '🏰 GUILDA', ['Uso: !guilda criar <nome>']);
      if (p.guild) return tReply(sock, msg, ctx, '🏰 GUILDA', [`❌ Já estás na guilda ${p.guild}`]);
      if (p.coins < 1000) return tReply(sock, msg, ctx, '🏰 GUILDA', ['❌ Precisas de 1000 coins']);
      p.coins -= 1000;
      p.guild = name;
      p.title = 'Fundador';
      return tReply(sock, msg, ctx, '🏰 GUILDA CRIADA', [
        `🏰 *${name}* fundada por *${p.name}*!`,
        `👑 Título: Fundador`,
        `💰 -1000 coins`,
      ]);
    }
    if (p.guild) {
      return tReply(sock, msg, ctx, '🏰 ' + p.guild.toUpperCase(), [
        `👑 ${p.name} — ${p.title || 'Membro'}`,
        `> Usa !guilda info para ver detalhes`,
      ]);
    }
    return tReply(sock, msg, ctx, '🏰 GUILDA', [
      'Sem guilda.',
      '> !guilda criar <nome> (1000 coins)',
      '> !guilda entrar <nome>',
    ]);
  }, true);

  // ═══ RANKING RPG ═══
  registerCase(['rankrpg', 'toprpg', 'rankglobal'], async ({ sock, msg, ctx }) => {
    const sorted = [...rpg._players.entries()]
      .sort((a, b) => b[1].level - a[1].level || b[1].kills - a[1].kills)
      .slice(0, 10);
    if (!sorted.length) return tReply(sock, msg, ctx, '🏆 RANKING', ['🏆 Sem jogadores ainda!']);
    const lines = sorted.map(([id, p], i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} *${p.name}* — Nv.${p.level} ⚔️${p.kills} 💀${p.deaths}`;
    });
    return tReply(sock, msg, ctx, '🏆 RANKING RPG', lines);
  }, true);

  // ═══ INVENTÁRIO ═══
  registerCase(['inventario', 'inv', 'bau'], async ({ sock, msg, ctx }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    if (!p.inventory.length) return tReply(sock, msg, ctx, '🎒 INVENTÁRIO', ['🎒 Vazio!']);
    const counts = {};
    p.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
    const lines = Object.entries(counts).map(([k, v]) => `• ${k} x${v}`);
    return tReply(sock, msg, ctx, '🎒 INVENTÁRIO', lines);
  }, true);

  // ═══ LOJA ═══
  registerCase(['loja', 'shop', 'mercador'], async ({ sock, msg, ctx, args }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    const item = args.join(' ').toLowerCase();
    const shop = {
      'poção de vida': 20, 'poção de mana': 25, 'poção de XP': 50,
      'espada de ferro': 100, 'espada de aço': 300, 'escudo de ferro': 150,
      'armadura de couro': 200, 'anel de sorte': 500,
    };
    if (item && shop[item]) {
      if (p.coins < shop[item]) return tReply(sock, msg, ctx, '🛒 LOJA', [`❌ ${item} custa ${shop[item]} coins (tens ${p.coins})`]);
      p.coins -= shop[item];
      p.inventory.push(item);
      return tReply(sock, msg, ctx, '🛒 LOJA', [`✅ Compraste *${item}* por ${shop[item]} coins`]);
    }
    const lines = Object.entries(shop).map(([k, v]) => `• ${k} — ${v} coins`);
    return tReply(sock, msg, ctx, '🛒 LOJA DO GRIMWALD', [...lines, '', `💰 Tens: ${p.coins} coins`, '> !loja <item>']);
  }, true);

  // ═══ TRABALHAR (narrativo) ═══
  registerCase(['trabalhar', 'work'], async ({ sock, msg, ctx }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
    const jobs = [
      { name: 'caçador de recompensas', story: 'Perseguiste um bandido pela floresta negra.', pay: R(40, 120), xp: R(15, 40), risk: 0.2 },
      { name: 'guarda da cidade', story: 'Patrulhaste as muralhas durante a noite.', pay: R(30, 80), xp: R(10, 25), risk: 0.05 },
      { name: 'explorador de masmorras', story: 'Desceste às profundezas em busca de tesouros.', pay: R(60, 200), xp: R(25, 60), risk: 0.4 },
      { name: 'mercador ambulante', story: 'Vendeste poções na praça do mercado.', pay: R(20, 60), xp: R(5, 15), risk: 0 },
      { name: 'ferreiro aprendiz', story: 'Forjaste espadas sob a orientação de Thorgar.', pay: R(25, 70), xp: R(10, 30), risk: 0.1 },
    ];
    const job = P(jobs);
    const danger = Math.random() < job.risk;

    if (danger) {
      const dmg = R(10, 30);
      p.hp = Math.max(0, p.hp - dmg);
      return tReply(sock, msg, ctx, `⚒️ ${job.name.toUpperCase()}`, [
        job.story,
        '',
        `⚠️ Algo correu mal! -${dmg} HP`,
        `❤️ HP: ${p.hp}/${p.maxHp}`,
      ]);
    }

    p.coins += job.pay;
    const lv = rpg.addXP(p, job.xp);
    return tReply(sock, msg, ctx, `⚒️ ${job.name.toUpperCase()}`, [
      job.story,
      '',
      `💰 +${job.pay} coins | ⭐ +${job.xp} XP`,
      lv ? `🎉 *NÍVEL ${p.level}!*` : '',
    ].filter(Boolean));
  }, true);

  // ═══ NPC INTERACTION ═══
  registerCase(['npc', 'falar', 'talk'], async ({ sock, msg, ctx, args }) => {
    const npcKey = args[0]?.toLowerCase() || P(Object.keys(rpg.NPCS));
    const npc = rpg.NPCS[npcKey] || P(Object.values(rpg.NPCS));
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
    return tReply(sock, msg, ctx, '🗺️ MAPA DO MUNDO', lines);
  }, true);

  // ═══ STATUS / VIDAS ═══
  registerCase(['vidas', 'lives', 'status'], async ({ sock, msg, ctx }) => {
    const p = rpg.getPlayer(ctx.senderNumber);
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
    return tReply(sock, msg, ctx, '📖 INFO RPG', ['🧬 RAÇAS:', races, '', '⚔️ CLASSES:', classes]);
  }, true);

  // ═══ NOME RPG ═══
  registerCase(['nome', 'rename'], async ({ sock, msg, ctx, args }) => {
    const name = args.join(' ').trim();
    if (!name || name.length > 20) return tReply(sock, msg, ctx, '📝 NOME', ['Uso: !nome <nome>']);
    const p = rpg.getPlayer(ctx.senderNumber);
    p.name = name;
    return tReply(sock, msg, ctx, '📝 NOME', [`✅ Nome: *${name}*`]);
  }, true);
};
