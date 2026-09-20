// sPR = Selective Private Relay (ghost tag).
// Kirim 1 stanza per target dengan ID SAMA, atribut participant = target.
// Server WA cuma nganter stanza ke participant itu. HP lain gak pernah terima.
import { generateWAMessageFromContent, generateMessageIDV2 } from 'axleys';

export const lastDiag = [];

async function resolveDevice(conn, candidates) {
  for (const jid of candidates) {
    try {
      const devices = await conn.getUSyncDevices([jid], false, false);
      if (devices?.length) {
        // utamakan alamat @lid (grup modern routing via LID)
        const lid = devices.find((d) => String(d.jid || '').endsWith('@lid') || d.server === 'lid');
        return (lid || devices[0]).jid;
      }
      lastDiag.push(`usync ${jid}: kosong`);
    } catch (e) {
      lastDiag.push(`usync ${jid}: err ${e.message}`);
    }
  }
  return candidates[0];
}

export default async function sPR(conn, chatJid, content, opts = {}) {
  const { mode = 'include', include = [], messageId = null } = opts;
  if (mode !== 'include' || !include.length) throw new Error('sPR: include kosong');

  const deviceJid = await resolveDevice(conn, include);

  // content bentuk { text, mentions } biar axleys yang bangun
  // extendedTextMessage + mentionedJid secara native (mention gak rontok).
  const waMsg = await generateWAMessageFromContent(chatJid, content, {
    userJid: conn.user.id,
    messageId: messageId || generateMessageIDV2(conn.user.id),
  });

  const mention = waMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || null;

  const res = await conn.relayMessage(chatJid, waMsg.message, {
    messageId: waMsg.key.id,
    // count=1: retry asli selalu bawa count>=1. count=0 diduga bikin client buang stanza.
    participant: { jid: deviceJid, count: 1 },
  });
  lastDiag.push(`t=${include[0]} dev=${deviceJid} mention=${JSON.stringify(mention)} relay=${res ? 'ack' : 'no-ack'}`);
  return waMsg.key.id;
}
