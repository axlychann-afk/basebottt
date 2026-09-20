import { generateMessageIDV2, prepareWAMessageMedia, delay } from 'axleys';
import sPR from '../lib/spr.js';

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
      await sPR(axmisu, m.chat, { text: `halo @${num} ${body}`, mentions: [p.id] }, {
        mode: 'include',
        // p.lid duluan: grup modern routing via @lid, PN sering bikin stanza nyasar
        include: [...new Set([p.lid, p.id, p.phoneNumber].filter(Boolean))],
        messageId,
      });
      ok++;
    } catch (e) {
      fail++;
      console.error(`[ghostreal] gagal ${p.id}:`, e.message);
    }
    await delay(1200);
  }
  await m.reply(`Done (${ok}/${participants.length} terkirim, ${fail} gagal). Tiap HP liat namanya sendiri.`);
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

const handler = async (axmisu, m) => {
  if (['ghostpp', 'gpp', 'pptag'].includes(m.command)) return ghostPp(axmisu, m);
  return ghostReal(axmisu, m);
};
handler.command = [...ghostReal.command, ...ghostPp.command];
handler.group = true;
export default handler;
