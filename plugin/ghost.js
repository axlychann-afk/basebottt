import { generateMessageIDV2, prepareWAMessageMedia, delay } from 'axleys';
import sPR, { lastDiag } from '../lib/spr.js';

const jidNum = (j) => String(j || '').split('@')[0].split(':')[0];

// .ghostreal / .gr : 1 teks, tiap HP liat namanya sendiri
const ghostReal = async (axmisu, m) => {
  if (!m.isGroup) return m.reply('Khusus grup.');
  const groupMeta = await axmisu.groupMetadata(m.chat);
  const botNum = jidNum(axmisu.user.id);
  const participants = groupMeta.participants.filter((p) => jidNum(p.id) !== botNum);
  if (!participants.length) return m.reply('Grup kosong.');

  const messageId = generateMessageIDV2(); // sekali di luar loop = nyawa ghost-nya
  const body = m.args.join(' ') || 'kamu kena ghost tag';
  await m.reply(`Ghosting ${participants.length} member...`);

  let ok = 0, fail = 0;
  for (const p of participants) {
    try {
      const num = jidNum(p.id);
      // cetakan B yang terbukti biru: extendedTextMessage rakitan tangan.
      // format native { text, mentions } TERBUKTI mati di axleys ini (mention=null).
      const msg = {
        extendedTextMessage: {
          text: `halo @${num} ${body}`,
          contextInfo: { mentionedJid: [p.id] },
        },
      };
      const includeJids = [...new Set([p.lid, p.id, p.phoneNumber].filter(Boolean))];
      await sPR(axmisu, m.chat, msg, { mode: 'include', include: includeJids, messageId });
      ok++;
    } catch (e) {
      fail++;
      console.error(`[ghostreal] gagal ${p.id}:`, e.message);
    }
    await delay(1200);
  }
  await m.reply(`Done (${ok}/${participants.length} terkirim, ${fail} gagal). Tiap HP liat namanya sendiri.\n--- diag ---\n${lastDiag.splice(0).join('\n') || '(diag kosong)'}`);
};
ghostReal.command = ['ghostreal', 'gr', 'ghosttag', 'gtag'];
ghostReal.group = true;

// .ghostpp : 1 gambar, tiap HP liat foto profilnya sendiri
const FALLBACK = 'https://cloud.yardansh.com/4aDFXw.jpg';
const ghostPp = async (axmisu, m) => {
  if (!m.isGroup) return m.reply('Khusus grup.');
  const groupMeta = await axmisu.groupMetadata(m.chat);
  const botNum = jidNum(axmisu.user.id);
  const participants = groupMeta.participants.filter((p) => jidNum(p.id) !== botNum);
  if (!participants.length) return m.reply('Grup kosong.');

  const messageId = generateMessageIDV2();
  await m.reply(`Preparing images (${participants.length} member)...`);

  let ok = 0, fail = 0;
  for (const p of participants) {
    try {
      const pn = p.phoneNumber || (String(p.id).endsWith('@s.whatsapp.net') ? p.id : null);
      let profile = await axmisu.profilePictureUrl(pn || p.id, 'image').catch(() => null);
      if (!profile && pn) profile = await axmisu.profilePictureUrl(p.id, 'image').catch(() => null);
      profile ||= FALLBACK;

      const { imageMessage } = await prepareWAMessageMedia(
        { image: { url: profile } },
        { upload: axmisu.waUploadToServer }
      );
      const msg = {
        imageMessage: {
          ...imageMessage,
          caption: `ini foto profilmu @${jidNum(p.id)}\n> _hanya kamu yang dapat melihat pesan ini._`,
          contextInfo: { mentionedJid: [p.id] },
        },
      };
      const includeJids = [...new Set([p.id, p.lid, pn].filter(Boolean))];
      await sPR(axmisu, m.chat, msg, { mode: 'include', include: includeJids, messageId });
      ok++;
    } catch (e) {
      fail++;
      console.error(`[ghostpp] gagal ${p.id}:`, e.message);
    }
    await delay(1500);
  }
  await m.reply(`Done (${ok}/${participants.length} terkirim, ${fail} gagal).`);
};
ghostPp.command = ['ghostpp', 'gpp', 'pptag'];
ghostPp.group = true;

// .ghosttest : diagnosa pembeda — broadcast normal (bukan ghost) ke 1 member.
// Kalau ini BIRU = pembangun pesan bener, yang rusak jalur participant.
// Kalau ini juga MATI = axleys gak ngerti format pesannya.
const ghostTest = async (axmisu, m) => {
  if (!m.isGroup) return m.reply('Khusus grup.');
  const { generateWAMessageFromContent, generateMessageIDV2 } = await import('axleys');
  const groupMeta = await axmisu.groupMetadata(m.chat);
  const botNum = jidNum(axmisu.user.id);
  const p = groupMeta.participants.find((x) => jidNum(x.id) !== botNum);
  if (!p) return m.reply('Gak ada member lain.');

  const out = [];
  const num = jidNum(p.id);

  // Tes A: format native { text, mentions }, broadcast biasa (ID unik)
  try {
    const waA = await generateWAMessageFromContent(m.chat, { text: `TES A halo @${num}`, mentions: [p.id] }, { userJid: axmisu.user.id });
    out.push(`A keys=${Object.keys(waA.message || {}).join(',')} mention=${JSON.stringify(waA.message?.extendedTextMessage?.contextInfo?.mentionedJid || null)}`);
    await axmisu.relayMessage(m.chat, waA.message, { messageId: waA.key.id });
    out.push('A terkirim (broadcast, ID unik)');
  } catch (e) { out.push(`A gagal: ${e.message}`); }

  // Tes B: extendedTextMessage rakitan tangan, broadcast biasa (ID unik)
  try {
    const waB = await generateWAMessageFromContent(m.chat, {
      extendedTextMessage: { text: `TES B halo @${num}`, contextInfo: { mentionedJid: [p.id] } },
    }, { userJid: axmisu.user.id });
    out.push(`B keys=${Object.keys(waB.message || {}).join(',')} mention=${JSON.stringify(waB.message?.extendedTextMessage?.contextInfo?.mentionedJid || null)}`);
    await axmisu.relayMessage(m.chat, waB.message, { messageId: waB.key.id });
    out.push('B terkirim (broadcast, ID unik)');
  } catch (e) { out.push(`B gagal: ${e.message}`); }

  await m.reply(`Hasil tes:\n${out.join('\n')}\nLihat grup: TES A / TES B yang BIRU yang mana?`);
};
ghostTest.command = ['ghosttest', 'gtest'];
ghostTest.group = true;

const handler = async (axmisu, m) => {
  if (['ghostpp', 'gpp', 'pptag'].includes(m.command)) return ghostPp(axmisu, m);
  if (['ghosttest', 'gtest'].includes(m.command)) return ghostTest(axmisu, m);
  return ghostReal(axmisu, m);
};
handler.command = [...ghostReal.command, ...ghostPp.command, 'ghosttest', 'gtest'];
handler.group = true;
export default handler;
