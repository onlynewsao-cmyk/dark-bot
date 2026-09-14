'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — incomingGames (v7.47)                           ║
 * ║   Port nativo de "campo minado.txt" (GleysonDevs)            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Correções vs snippet original:
 *  - `revealAll = False` (Python) → `false` (corrigido, era SyntaxError)
 *  - store em Map do módulo em vez de global.minadoDB
 */

// chatId::userId => game
const minadoDB = new Map();

function minadoKey(chatId, userId) {
  return `${chatId}::${userId}`;
}

function minadoConfig(level = 'medio') {
  const lv = String(level || '').toLowerCase();
  if (lv === 'facil' || lv === 'fácil') return { rows: 5, cols: 5, bombs: 5, name: 'Fácil' };
  if (lv === 'dificil' || lv === 'difícil') return { rows: 8, cols: 8, bombs: 12, name: 'Difícil' };
  return { rows: 6, cols: 6, bombs: 8, name: 'Médio' };
}

function createMinadoGame(level = 'medio') {
  const cfg = minadoConfig(level);
  const board = [];
  for (let r = 0; r < cfg.rows; r++) {
    const row = [];
    for (let c = 0; c < cfg.cols; c++) row.push({ bomb: false, open: false, flag: false, around: 0 });
    board.push(row);
  }
  let placed = 0;
  while (placed < cfg.bombs) {
    const rr = Math.floor(Math.random() * cfg.rows);
    const cc = Math.floor(Math.random() * cfg.cols);
    if (!board[rr][cc].bomb) { board[rr][cc].bomb = true; placed++; }
  }
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      if (board[r][c].bomb) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && board[nr][nc].bomb) count++;
        }
      }
      board[r][c].around = count;
    }
  }
  return {
    level: cfg.name, rows: cfg.rows, cols: cfg.cols, bombs: cfg.bombs,
    flagsUsed: 0, startedAt: Date.now(), status: 'playing', board,
  };
}

function parseMinadoPos(input, rows, cols) {
  if (!input) return null;
  const match = String(input).trim().toUpperCase().match(/^([A-Z])(\d{1,2})$/);
  if (!match) return null;
  const row = match[1].charCodeAt(0) - 65;
  const col = parseInt(match[2], 10) - 1;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}

function minadoCellEmoji(cell, revealAll = false) {
  if (revealAll && cell.bomb) return '💣';
  if (cell.flag) return '🚩';
  if (!cell.open) return '⬜';
  if (cell.bomb) return '💥';
  if (cell.around === 0) return '🟦';
  return ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'][cell.around] || '⬛';
}

function renderMinado(game, revealAll = false) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = `💣 *MINADO*\n🎚️ Nível: ${game.level}\n💥 Bombas: ${game.bombs}\n🚩 Bandeiras: ${game.flagsUsed}/${game.bombs}\n\n⬛ `;
  for (let c = 0; c < game.cols; c++) out += `${c + 1}️⃣ `;
  out += '\n';
  for (let r = 0; r < game.rows; r++) {
    out += `${letters[r]} `;
    for (let c = 0; c < game.cols; c++) out += `${minadoCellEmoji(game.board[r][c], revealAll)} `;
    out += '\n';
  }
  return out.trim();
}

function floodOpen(game, row, col, visited = new Set()) {
  const key = `${row},${col}`;
  if (visited.has(key)) return;
  visited.add(key);
  const cell = game.board[row][col];
  if (cell.open || cell.flag) return;
  cell.open = true;
  if (cell.around !== 0 || cell.bomb) return;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols) floodOpen(game, nr, nc, visited);
    }
  }
}

function checkMinadoWin(game) {
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const cell = game.board[r][c];
      if (!cell.bomb && !cell.open) return false;
    }
  }
  return true;
}

function openMinado(game, row, col) {
  if (game.status !== 'playing') return { ok: false, msg: 'Essa partida já terminou.' };
  const cell = game.board[row][col];
  if (cell.flag) return { ok: false, msg: 'Essa casa está marcada com bandeira.' };
  if (cell.open) return { ok: false, msg: 'Essa casa já está aberta.' };
  if (cell.bomb) { cell.open = true; game.status = 'lost'; return { ok: true, boom: true, msg: '💥 Encontraste uma bomba!' }; }
  floodOpen(game, row, col);
  if (checkMinadoWin(game)) { game.status = 'won'; return { ok: true, win: true, msg: '🏆 Venceste a partida!' }; }
  return { ok: true, msg: 'Casa aberta com sucesso.' };
}

function flagMinado(game, row, col, mode = 'mark') {
  if (game.status !== 'playing') return { ok: false, msg: 'Essa partida já terminou.' };
  const cell = game.board[row][col];
  if (cell.open) return { ok: false, msg: 'Não podes marcar uma casa já aberta.' };
  if (mode === 'mark') {
    if (cell.flag) return { ok: false, msg: 'Essa casa já está marcada.' };
    cell.flag = true; game.flagsUsed++;
    return { ok: true, msg: '🚩 Casa marcada.' };
  }
  if (mode === 'unmark') {
    if (!cell.flag) return { ok: false, msg: 'Essa casa não está marcada.' };
    cell.flag = false; game.flagsUsed = Math.max(0, game.flagsUsed - 1);
    return { ok: true, msg: '✅ Bandeira removida.' };
  }
  return { ok: false, msg: 'Modo inválido.' };
}

function formatMinadoDuration(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}m ${total % 60}s`;
}

module.exports = function registerIncomingGames(registerCase) {

  registerCase(['minado', 'campominado'], async ({ m, args, prefix, command }) => {
    try {
      const userId = String(m.sender || '').split('@')[0].split(':')[0];
      const key = minadoKey(m.chat, userId);
      const game = minadoDB.get(key) || null;
      const sub = String(args[0] || '').toLowerCase();
      const val = String(args[1] || '').toUpperCase();
      const uso = `${prefix + command}`;

      if (!sub || sub === 'ajuda' || sub === 'help' || sub === 'ajudar') {
        return m.reply(
          `💣 *JOGO MINADO*\n\nComandos:\n` +
          `• ${uso} iniciar [facil|medio|dificil]\n` +
          `• ${uso} abrir A1\n` +
          `• ${uso} marcar B2\n` +
          `• ${uso} desmarcar B2\n` +
          `• ${uso} ver\n` +
          `• ${uso} sair\n\nExemplo: ${uso} iniciar medio`
        );
      }
      if (sub === 'iniciar' || sub === 'start' || sub === 'novo') {
        const g = createMinadoGame(args[1] || 'medio');
        minadoDB.set(key, g);
        m.react('🎮');
        return m.reply(`🎮 Partida iniciada!\n\n${renderMinado(g)}\n\nUsa *${uso} abrir A1* para jogar.`);
      }
      if (!game) return m.reply(`Não tens partida ativa. Usa *${uso} iniciar*.`);
      if (sub === 'ver' || sub === 'board' || sub === 'tabuleiro') return m.reply(renderMinado(game));
      if (sub === 'sair' || sub === 'surrender' || sub === 'desistir') {
        minadoDB.delete(key);
        return m.reply('🛑 Partida de minado encerrada.');
      }
      if (sub === 'abrir' || sub === 'open' || sub === 'jogar') {
        const pos = parseMinadoPos(val, game.rows, game.cols);
        if (!pos) return m.reply('Posição inválida. Exemplo: A1, B3, C5');
        const result = openMinado(game, pos.row, pos.col);
        if (!result.ok) return m.reply(result.msg);
        if (result.boom) {
          const board = renderMinado(game, true);
          minadoDB.delete(key);
          m.react('💥');
          return m.reply(`${result.msg}\n\n${board}\n\n💀 Fim de jogo.`);
        }
        if (result.win) {
          const tempo = formatMinadoDuration(Date.now() - game.startedAt);
          const board = renderMinado(game, true);
          minadoDB.delete(key);
          m.react('🏆');
          return m.reply(`${result.msg}\n⏱️ Tempo: ${tempo}\n\n${board}`);
        }
        return m.reply(`${result.msg}\n\n${renderMinado(game)}`);
      }
      if (sub === 'marcar' || sub === 'flag') {
        const pos = parseMinadoPos(val, game.rows, game.cols);
        if (!pos) return m.reply('Posição inválida. Exemplo: A1, B3, C5');
        const result = flagMinado(game, pos.row, pos.col, 'mark');
        return m.reply(`${result.msg}\n\n${renderMinado(game)}`);
      }
      if (sub === 'desmarcar' || sub === 'unflag') {
        const pos = parseMinadoPos(val, game.rows, game.cols);
        if (!pos) return m.reply('Posição inválida. Exemplo: A1, B3, C5');
        const result = flagMinado(game, pos.row, pos.col, 'unmark');
        return m.reply(`${result.msg}\n\n${renderMinado(game)}`);
      }
      return m.reply('Subcomando inválido. Usa: iniciar, abrir, marcar, desmarcar, ver, sair.');
    } catch (e) {
      console.error('[minado]', e.message?.slice(0, 80));
      return m.reply('Ocorreu um erro no jogo minado.');
    }
  });
};

module.exports._minadoDB = minadoDB;
