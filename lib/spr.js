// sPR = Selective Private Relay (ghost tag).
// Kirim 1 stanza per target dengan ID SAMA, atribut participant = target.
// Server WA cuma nganter stanza ke participant itu. HP lain gak pernah terima.
import { generateWAMessageFromContent, generateMessageIDV2 } from 'axleys';

const DEBUG = process.env.GHOST_DEBUG;

async function resolveDevice(conn, candidates) {
  for (const jid of candidates) {
    try {
      const devices = await conn.getUSyncDevices([jid], false, false);
      if (devices?.length) {
        // utamakan alamat @lid (grup modern routing via LID)
        const lid = devices.find((d) => String(d.jid || '').endsWith('@lid') || d.server === 'lid');
        return (lid || devices[0]).jid;
      }
    } catch (e) {
      if (DEBUG) console.log('[sPR debug] usync gagal', jid, e.message);
    }
  }
  return candidates[0];
}

export default async function sPR(conn, chatJid, content, opts = {}) {
  const { mode = 'include', include = [], messageId = null } = opts;
  if (mode !== 'include' || !include.length) throw new Error('sPR: include kosong');

  const deviceJid = await resolveDevice(conn, include);
  if (DEBUG) console.log('[sPR debug] target=', include[0], 'device=', deviceJid);

  // content bentuk { text, mentions } biar axleys yang bangun
  // extendedTextMessage + mentionedJid secara native (mention gak rontok).
  const waMsg = await generateWAMessageFromContent(chatJid, content, {
    userJid: conn.user.id,
    messageId: messageId || generateMessageIDV2(conn.user.id),
  });

  if (DEBUG) {
    console.log('[sPR debug] msgId=', waMsg.key.id,
      'mention=', JSON.stringify(waMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || null));
  }

  const res = await conn.relayMessage(chatJid, waMsg.message, {
    messageId: waMsg.key.id,
    participant: { jid: deviceJid, count: 0 },
  });
  if (DEBUG) console.log('[sPR debug] relay ok', waMsg.key.id, '->', deviceJid, res ? 'ack' : 'no-ack');
  return waMsg.key.id;
}
