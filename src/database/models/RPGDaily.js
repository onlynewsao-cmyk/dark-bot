/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG DAILY MISSIONS                            ║
 * ║   Missões diárias e semanais                                     ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const mongoose = require('mongoose');

const dailySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },

  // Data da última reivindicação (YYYY-MM-DD)
  lastClaimed: {
    type: String,
    default: null,
  },

  // Streak de dias consecutivos
  streak: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Missões completadas hoje
  missionsCompleted: [{
    missionId: String,
    completedAt: Date,
  }],

  // Missões semanais
  weeklyMissions: [{
    missionId: String,
    completedAt: Date,
    week: String, // YYYY-Www
  }],

  // Recompensas totais
  totalRewards: {
    berries: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    crystals: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  collection: 'rpg_daily',
});

// Índice para streak
dailySchema.index({ userId: 1, streak: -1 });

/**
 * Obtém missões disponíveis para hoje
 */
dailySchema.statics.getAvailableMissions = function() {
  return [
    {
      id: 'battle_3',
      name: 'Guerreiro',
      desc: 'Vence 3 batalhas',
      target: 3,
      reward: { berries: 500, xp: 100 },
    },
    {
      id: 'quest_1',
      name: 'Aventureiro',
      desc: 'Completa 1 quest',
      target: 1,
      reward: { berries: 800, xp: 200 },
    },
    {
      id: 'train_5',
      name: 'Disciplinado',
      desc: 'Treina 5 vezes',
      target: 5,
      reward: { berries: 600, xp: 150 },
    },
    {
      id: 'gacha_2',
      name: 'Colecionador',
      desc: 'Faz 2 invocações gacha',
      target: 2,
      reward: { berries: 1000, xp: 300 },
    },
  ];
};

/**
 * Obtém missões semanais
 */
dailySchema.statics.getWeeklyMissions = function() {
  return [
    {
      id: 'weekly_boss',
      name: 'Caçador de Bosses',
      desc: 'Derrota 3 bosses esta semana',
      target: 3,
      reward: { berries: 5000, xp: 2000, crystals: 50 },
    },
    {
      id: 'weekly_battles',
      name: 'Guerreiro Veterano',
      desc: 'Vence 20 batalhas esta semana',
      target: 20,
      reward: { berries: 8000, xp: 3000 },
    },
  ];
};

/**
 * Verifica se pode reclamar recompensa diária
 */
dailySchema.statics.canClaim = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await this.findOne({ userId });

  if (!record) return { canClaim: true, streak: 0 };
  if (record.lastClaimed === today) return { canClaim: false, streak: record.streak };

  // Verifica se é dia consecutivo
  const lastDate = new Date(record.lastClaimed);
  const todayDate = new Date();
  const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { canClaim: true, streak: record.streak + 1 };
  } else {
    return { canClaim: true, streak: 1 }; // Reset streak
  }
};

/**
 * Reclama recompensa diária
 */
dailySchema.statics.claimDaily = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  let record = await this.findOne({ userId });

  if (!record) {
    record = new this({ userId, lastClaimed: today, streak: 1 });
  } else {
    if (record.lastClaimed === today) {
      return { success: false, message: 'Já reclamaste hoje! Volta amanhã.' };
    }

    const lastDate = new Date(record.lastClaimed);
    const todayDate = new Date();
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      record.streak += 1;
    } else {
      record.streak = 1; // Reset
    }

    record.lastClaimed = today;
    record.missionsCompleted = []; // Reset missões diárias
  }

  // Recompensa base
  const baseReward = {
    berries: 500,
    xp: 100,
    crystals: 10,
  };

  // Bónus de streak
  const streakBonus = Math.min(record.streak, 30); // Max 30 dias
  const multiplier = 1 + (streakBonus * 0.05); // +5% por dia de streak

  const reward = {
    berries: Math.floor(baseReward.berries * multiplier),
    xp: Math.floor(baseReward.xp * multiplier),
    crystals: baseReward.crystals,
  };

  record.totalRewards.berries += reward.berries;
  record.totalRewards.xp += reward.xp;
  record.totalRewards.crystals += reward.crystals;

  await record.save();

  return {
    success: true,
    reward,
    streak: record.streak,
    multiplier: multiplier.toFixed(2),
  };
};

/**
 * Completa uma missão diária
 */
dailySchema.statics.completeMission = async function(userId, missionId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await this.findOne({ userId });

  if (!record) {
    return { success: false, message: 'Nenhum registo encontrado.' };
  }

  if (record.lastClaimed !== today) {
    return { success: false, message: 'Missões disponíveis apenas após reclamar daily.' };
  }

  const alreadyCompleted = record.missionsCompleted.find(m => m.missionId === missionId);
  if (alreadyCompleted) {
    return { success: false, message: 'Missão já completa hoje.' };
  }

  const missions = this.getAvailableMissions();
  const mission = missions.find(m => m.id === missionId);

  if (!mission) {
    return { success: false, message: 'Missão não encontrada.' };
  }

  record.missionsCompleted.push({
    missionId,
    completedAt: new Date(),
  });

  record.totalRewards.berries += mission.reward.berries;
  record.totalRewards.xp += mission.reward.xp;

  await record.save();

  return {
    success: true,
    reward: mission.reward,
  };
};

/**
 * Obtém status das missões
 */
dailySchema.statics.getMissionsStatus = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await this.findOne({ userId });

  if (!record || record.lastClaimed !== today) {
    return {
      dailyClaimed: false,
      missionsCompleted: [],
      streak: 0,
    };
  }

  return {
    dailyClaimed: true,
    missionsCompleted: record.missionsCompleted.map(m => m.missionId),
    streak: record.streak,
    totalRewards: record.totalRewards,
  };
};

const RPGDaily = mongoose.model('RPGDaily', dailySchema);

module.exports = RPGDaily;
