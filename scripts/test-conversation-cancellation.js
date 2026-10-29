'use strict';
const assert = require('assert/strict');
const { createConversationControls } = require('../src/aura/auraConversation');
const a = { remoteJid: '120000000000001@g.us', senderJid: '244900000001@s.whatsapp.net' };
const b = { ...a, senderJid: '244900000002@s.whatsapp.net' };
const otherChat = { ...a, remoteJid: '120000000000002@g.us' };
const controls = () => createConversationControls({ storage: { load: () => ({}), save: () => {} } });
let count = 0;
function test(name, fn) { fn(); count++; console.log('✓', name); }
test('Arrival cancels active conversation before a queued message starts its handler', () => {
  const c = controls(); c.noteIncoming(a, { messageId: 'first' });
  const old = c.begin(a, { messageId: 'first' }); old.conversational = true;
  c.noteIncoming(a, { messageId: 'second' });
  assert.equal(old.signal.aborted, true); assert.equal(c.canDeliver(a, old), false);
});
test('Other participants and chats cannot cancel this participant', () => {
  const c = controls(); const old = c.begin(a); old.conversational = true;
  c.noteIncoming(b, { messageId: 'other-person' }); c.noteIncoming(otherChat, { messageId: 'other-chat' });
  assert.equal(old.signal.aborted, false); assert.equal(c.canDeliver(a, old), true);
});
test('An older queued request cannot overwrite/cancel the active newest turn', () => {
  const c = controls(); c.noteIncoming(a, { messageId: 'queued-old' }); c.noteIncoming(a, { messageId: 'newest' });
  const newest = c.begin(a, { messageId: 'newest' }); newest.conversational = true;
  const old = c.begin(a, { messageId: 'queued-old' }); old.conversational = true;
  assert.equal(old.signal.aborted, true); assert.equal(c.canDeliver(a, old), false);
  c.finish(old); assert.equal(newest.signal.aborted, false); assert.equal(c.canDeliver(a, newest), true);
});
test('Safety/moderation or explicit command work is not retrospectively cancelled', () => {
  const c = controls(); const command = c.begin(a);
  c.noteIncoming(a, { messageId: 'next-message' }); c.begin(a, { messageId: 'next-message' });
  assert.equal(command.signal.aborted, false); assert.equal(c.canDeliver(a, command), true);
});
test('Pause aborts in-flight chat, while a duplicate/older receipt does not abort fresh work', () => {
  const c = controls(); const now = Math.floor(Date.now() / 1000);
  c.noteIncoming(a, { messageId: 'current', timestamp: now });
  const turn = c.begin(a, { messageId: 'current', timestamp: now }); turn.conversational = true;
  assert.equal(c.noteIncoming(a, { messageId: 'current', timestamp: now }), false);
  assert.equal(c.noteIncoming(a, { messageId: 'delayed-old', timestamp: now - 10 }), false);
  assert.equal(turn.signal.aborted, false);
  assert.doesNotThrow(() => c.noteIncoming(b, { messageId: 'broken-time', timestamp: { toNumber() { throw new Error('bad timestamp'); } } }));
  c.process('ignora-me', a); assert.equal(turn.signal.aborted, true);
  c.process('volta a responder', a); assert.equal(c.canDeliver(a, turn), false);
});
test('Finishing a conversation cleans up its signal, but not another participant', () => {
  const c = controls(); const first = c.begin(a); first.conversational = true;
  const other = c.begin(b); other.conversational = true;
  c.finish(first); assert.equal(first.signal.aborted, true); assert.equal(other.signal.aborted, false);
});
console.log(`CONVERSATION CANCELLATION: ${count} groups OK / 0 falhas`);
