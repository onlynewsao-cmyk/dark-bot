const mongoose = require('mongoose');

/**
 * v9.14 — CENTRAL DE SESSÕES (failover 4 slots).
 * Slot 1 = a sessão ACTIVA (usa os docs sem prefixo, 'creds' — nada muda
 * para o bot de hoje). Slots 2–4 guardam sessões à espera com os docs
 * prefixados (`slot2:creds`, …). A que estiver VIVA vai para o slot 1.
 *
 * estados:
 *   vazia    — nada registado
 *   ligacao  — pairing novo em curso (código gerado, à espera do scan)
 *   guardada — ligada e testada pelo menos 1x; à espera de promoção
 *   ativa    — é a que o bot está a usar AGORA
 *   morta    — falhou (ban/logout/403); fica 2 dias em comatoso (retry)
 */
const SessionSlotSchema = new mongoose.Schema({
  slot:      { type: Number, required: true, unique: true, min: 1, max: 4 },
  prefixo:   { type: String, default: '' },           // '' = slot 1 (creds)
  estado:    { type: String, required: true, default: 'vazia' },
  numero:    { type: String, default: '' },
  motivo:    { type: String, default: '' },
  tentativas:{ type: Number, default: 0 },
  desde:     { type: Date },
  ultimaViva:{ type: Date },
  ultimaProva:{ type: Date },
  retryAte:  { type: Date },           // janela de 2 dias a insistir
}, { timestamps: true, collection: 'session_slots' });

module.exports = mongoose.model('SessionSlot', SessionSlotSchema);
