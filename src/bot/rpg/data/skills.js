/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG SKILLS DATA                               ║
 * ║   Skills por origem (10+ cada)                                   ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const SKILLS = {
  shinobi: [
    { name: 'Rasengan', emoji: '🍥', type: 'atk', power: 80, cost: 20, desc: 'Esfera de chakra rotativa' },
    { name: 'Chidori', emoji: '⚡', type: 'atk', power: 75, cost: 18, desc: 'Raio na mão' },
    { name: 'Sharingan', emoji: '👁️', type: 'buff', power: 0, cost: 30, desc: '+50% crítico por 3 turnos' },
    { name: 'Modo Sábio', emoji: '🐸', type: 'buff', power: 0, cost: 40, desc: '+100% ATK por 2 turnos' },
    { name: 'Rasenshuriken', emoji: '🌀', type: 'atk', power: 120, cost: 35, desc: 'Vórtice de chakra' },
    { name: 'Kage Bunshin', emoji: '👥', type: 'buff', power: 0, cost: 15, desc: '+30% esquiva' },
    { name: 'Amaterasu', emoji: '🔥', type: 'atk', power: 100, cost: 50, desc: 'Chamas negras eternas' },
    { name: 'Susanoo', emoji: '🛡️', type: 'def', power: 0, cost: 60, desc: '-80% dano recebido por 2 turnos' },
    { name: 'Bijuudama', emoji: '💥', type: 'atk', power: 150, cost: 70, desc: 'Bomba de bijuu' },
    { name: 'Edo Tensei', emoji: '💀', type: 'special', power: 0, cost: 80, desc: 'Revive com 50% HP' },
  ],
  pirata: [
    { name: 'Gomu Gomu no Pistol', emoji: '👊', type: 'atk', power: 60, cost: 10, desc: 'Soco de borracha' },
    { name: 'Gear 2', emoji: '🔴', type: 'buff', power: 0, cost: 25, desc: '+80% velocidade e ATK' },
    { name: 'Gear 4', emoji: '💪', type: 'buff', power: 0, cost: 40, desc: '+150% ATK por 3 turnos' },
    { name: 'Gear 5', emoji: '🤍', type: 'buff', power: 0, cost: 80, desc: '+300% tudo por 2 turnos' },
    { name: 'Haki do Rei', emoji: '👑', type: 'special', power: 200, cost: 60, desc: 'Dano em área massivo' },
    { name: 'Santoryu', emoji: '⚔️', type: 'atk', power: 110, cost: 30, desc: '3 espadas simultâneas' },
    { name: 'Gomu Gomu no Red Hawk', emoji: '🔥', type: 'atk', power: 95, cost: 25, desc: 'Soco de fogo' },
    { name: 'Bara Bara no Mi', emoji: '✂️', type: 'def', power: 0, cost: 20, desc: 'Imune a cortes' },
    { name: 'Gomu Gomu no King Kong Gun', emoji: '🦍', type: 'atk', power: 180, cost: 55, desc: 'Soco gigante' },
    { name: 'Sulong', emoji: '🌙', type: 'buff', power: 0, cost: 45, desc: '+200% ATK noturno' },
  ],
  cacador: [
    { name: 'Adaga Dupla', emoji: '🗡️', type: 'atk', power: 70, cost: 15, desc: 'Ataque duplo' },
    { name: 'Dominação', emoji: '👁️', type: 'special', power: 0, cost: 30, desc: 'Controla inimigo por 1 turno' },
    { name: 'Arise', emoji: '🌑', type: 'special', power: 0, cost: 50, desc: 'Extrai sombra do boss' },
    { name: 'Exército das Sombras', emoji: '💀', type: 'atk', power: 130, cost: 45, desc: 'Ataque de todas as sombras' },
    { name: 'Passo Sombrio', emoji: '👣', type: 'buff', power: 0, cost: 20, desc: '+90% esquiva por 2 turnos' },
    { name: 'Corte do Monarca', emoji: '⚔️', type: 'atk', power: 160, cost: 55, desc: 'Corte que ignora defesa' },
    { name: 'Berseker', emoji: '🪓', type: 'buff', power: 0, cost: 35, desc: '+100% ATK, -50% defesa' },
    { name: 'Teletransporte', emoji: '⚡', type: 'buff', power: 0, cost: 25, desc: 'Esquiva garantida 1x' },
    { name: 'Ressurreição', emoji: '💀', type: 'special', power: 0, cost: 100, desc: 'Revive com 100% HP' },
    { name: 'Monarca Absoluto', emoji: '👑', type: 'special', power: 300, cost: 90, desc: 'Dano devastador' },
  ],
  feiticeiro: [
    { name: 'Infinito', emoji: '♾️', type: 'def', power: 0, cost: 20, desc: '-90% dano recebido' },
    { name: 'Vazio', emoji: '👁️', type: 'atk', power: 90, cost: 25, desc: 'Ataque de maldição' },
    { name: 'Púrpura', emoji: '🟣', type: 'atk', power: 140, cost: 40, desc: 'Combinação azul+vermelho' },
    { name: 'Domínio: Vazio Infinito', emoji: '🏛️', type: 'special', power: 0, cost: 80, desc: 'Inimigo atordoado 3 turnos' },
    { name: 'Punho Negro', emoji: '👊', type: 'atk', power: 85, cost: 15, desc: 'Crítico garantido' },
    { name: 'Black Flash', emoji: '⚡', type: 'atk', power: 120, cost: 30, desc: 'Dano dimensional' },
    { name: 'Divergência', emoji: '🌊', type: 'atk', power: 70, cost: 12, desc: 'Ataque reverso' },
    { name: 'Maldição', emoji: '💀', type: 'debuff', power: 0, cost: 35, desc: '-50% ATK inimigo' },
    { name: 'Sukuna Forma', emoji: '👹', type: 'buff', power: 0, cost: 70, desc: '+200% ATK por 2 turnos' },
    { name: 'Corte Espacial', emoji: '✂️', type: 'atk', power: 200, cost: 60, desc: 'Ignora tudo' },
  ],
  hashira: [
    { name: 'Respiração da Água', emoji: '🌊', type: 'atk', power: 75, cost: 15, desc: 'Corte aquático' },
    { name: 'Hinokami Kagura', emoji: '🔥', type: 'atk', power: 110, cost: 30, desc: 'Dança do fogo solar' },
    { name: 'Respiração do Trovão', emoji: '⚡', type: 'atk', power: 85, cost: 18, desc: 'Corte instantâneo' },
    { name: 'Respiração da Chama', emoji: '🔥', type: 'atk', power: 95, cost: 22, desc: 'Chamas devastadoras' },
    { name: 'Espada Negra', emoji: '🖤', type: 'buff', power: 0, cost: 25, desc: '+60% ATK vs demônios' },
    { name: 'Marca Hashira', emoji: '⚔️', type: 'buff', power: 0, cost: 40, desc: '+100% ATK por 3 turnos' },
    { name: 'Verdadeira Respiração', emoji: '💨', type: 'atk', power: 140, cost: 45, desc: 'Todas as respirações' },
    { name: 'Corte Transparente', emoji: '👁️', type: 'atk', power: 100, cost: 28, desc: 'Inimigo não vê' },
    { name: 'Dança das Lâminas', emoji: '💃', type: 'atk', power: 120, cost: 35, desc: 'Múltiplos cortes' },
    { name: 'Juramento', emoji: '🛡️', type: 'special', power: 0, cost: 50, desc: 'Sacrifica HP para +200% ATK' },
  ],
  saiyajin: [
    { name: 'Kamehameha', emoji: '🐉', type: 'atk', power: 100, cost: 25, desc: 'Onda de energia clássica' },
    { name: 'Super Saiyajin', emoji: '💛', type: 'buff', power: 0, cost: 30, desc: '+100% todos os stats' },
    { name: 'Final Flash', emoji: '💥', type: 'atk', power: 130, cost: 35, desc: 'Flash devastador' },
    { name: 'Big Bang Attack', emoji: '🔵', type: 'atk', power: 90, cost: 20, desc: 'Esfera de energia' },
    { name: 'Genkidama', emoji: '🌍', type: 'atk', power: 250, cost: 80, desc: 'Espírito da Terra' },
    { name: 'Ultra Instinto', emoji: '⚪', type: 'buff', power: 0, cost: 60, desc: 'Esquiva automática +100%' },
    { name: 'Ultra Ego', emoji: '💜', type: 'buff', power: 0, cost: 60, desc: '+200% ATK quando ferido' },
    { name: 'Kaioken', emoji: '🔴', type: 'buff', power: 0, cost: 20, desc: '+50% ATK, -20% HP' },
    { name: 'Transformação Oozaru', emoji: '🦍', type: 'buff', power: 0, cost: 40, desc: '+150% ATK noturno' },
    { name: 'Hakai', emoji: '💀', type: 'special', power: 500, cost: 100, desc: 'Destruição divina' },
  ],
};

module.exports = { SKILLS };
