// sPR = Selective Private Relay (ghost tag).
// Kirim 1 stanza per target dengan ID SAMA, atribut participant = target.
// Server WA cuma nganter stanza ke participant itu. HP lain gak pernah terima.
import { generateWAMessageFromContent, generateMessageIDV2 } from 'axleys';

export default async function sPR(conn, chatJid, content, opts = {}) {
  const { mode = 'include', include = [], messageId = null } = opts;
  if (mode !== 'include' || !include.length) throw new Error('sPR: include kosong');
  const target = include[0];

  let deviceJid = target;
  try {
    const devices = await conn.getUSyncDevices([target], false, false);
    if (devices?.[0]?.jid) deviceJid = devices[0].jid;
  } catch {}

  // content bentuk { text, mentions } biar axleys yang bangun
  // extendedTextMessage + mentionedJid secara native (mention gak rontok).
  const waMsg = await generateWAMessageFromContent(chatJid, content, {
    userJid: conn.user.id,
    messageId: messageId || generateMessageIDV2(conn.user.id),
  });

  if (process.env.GHOST_DEBUG) {
    console.log('[sPR debug]', target, JSON.stringify(waMsg.message?.extendedTextMessage?.contextInfo || null));
  }

  await conn.relayMessage(chatJid, waMsg.message, {
    messageId: waMsg.key.id,
    participant: { jid: deviceJid, count: 0 },
  });
  return waMsg.key.id;
}
