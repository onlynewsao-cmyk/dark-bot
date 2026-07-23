/**
 * Auth state do Baileys persistido no MongoDB.
 * Corrigido para evitar Duplicate Key e garantir limpeza total.
 */
const { proto, initAuthCreds, BufferJSON } = require('@systemzero/baileys');
const Session = require('../database/models/Session');

async function useMongoAuthState() {
  async function writeData(data, fileName) {
    const content = JSON.stringify(data, BufferJSON.replacer);
    // Usa a coleção whatsapp_sessions definida no modelo
    await Session.findOneAndUpdate({ fileName }, { content }, { upsert: true });
  }

  async function readData(fileName) {
    try {
      const doc = await Session.findOne({ fileName });
      if (!doc) return null;
      return JSON.parse(doc.content, BufferJSON.reviver);
    } catch { return null; }
  }

  async function removeData(fileName) {
    try { await Session.deleteOne({ fileName }); } catch {}
  }

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const fileName = `${category}-${id}`;
              tasks.push(value ? writeData(value, fileName) : removeData(fileName));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => writeData(creds, 'creds'),
    clearSession: async () => { 
      console.log('🧹 Limpando todas as sessões do WhatsApp no MongoDB...');
      await Session.deleteMany({}); 
    },
  };
}

module.exports = { useMongoAuthState };
