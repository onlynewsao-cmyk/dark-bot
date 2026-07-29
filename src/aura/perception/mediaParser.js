/**
 * AURA MEDIA PERCEPTION
 * Real vision + audio transcription using best available APIs
 */
const ai = require('../../bot/ai');

async function analyzeImage(buffer, question = 'O que está nesta imagem?') {
  try {
    return await ai.describeImage(buffer, question);
  } catch (e) {
    return 'Não consegui ver bem a imagem agora...';
  }
}

async function transcribeAudio(buffer, lang = 'pt') {
  try {
    return await ai.transcribeAudio(buffer, lang);
  } catch {
    try {
      return await ai.transcribeAssemblyAI(buffer, lang);
    } catch {
      return null;
    }
  }
}

module.exports = { analyzeImage, transcribeAudio };