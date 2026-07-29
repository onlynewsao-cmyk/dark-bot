/**
 * AURA ENGINE — Real Person Simulation Core
 * Aura acts as a real 19yo Brazilian OTOME girl inside WhatsApp
 * Only fully loyal & intimate with Dark (owner)
 */
const fs = require('fs');
const path = require('path');

const AURA_DIR = path.join(__dirname, '..');

let memory = {
  lastInteraction: {},
  silence: {},
  mood: 'normal',
  relationship: {} // per-user profile
};

function loadMemory() {
  try {
    const file = path.join(AURA_DIR, 'memory.json');
    if (fs.existsSync(file)) memory = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
}

function saveMemory() {
  try {
    fs.writeFileSync(path.join(AURA_DIR, 'memory.json'), JSON.stringify(memory, null, 2));
  } catch {}
}

module.exports = {
  memory,
  loadMemory,
  saveMemory,
  isSilenced(number) {
    const until = memory.silence[number];
    return until && Date.now() < until;
  },
  setSilence(number, seconds) {
    memory.silence[number] = Date.now() + (seconds * 1000);
    saveMemory();
  },
  clearSilence(number = null) {
    if (number) delete memory.silence[number];
    else memory.silence = {};
    saveMemory();
  }
};