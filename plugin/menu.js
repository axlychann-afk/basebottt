const handler = async (axmisu, m, { prefix }) => {
  const mode = global.db.botPublic ? 'Public' : 'Self';
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const mnt = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);

  const teks = `╭─「 *${global.botname}* 」
│ Mode    : ${mode}
│ Uptime  : ${h}j ${mnt}m ${s}d
│ Website : axmisu.biz.id
╰────────────────

*DAFTAR COMMAND*
${prefix}menu   - Tampilkan menu ini
${prefix}brat   - sticker brat
${prefix}s      - Ubah gambar/video/gif ke stiker
${prefix}tt     - Download video TikTok
${prefix}ghostreal - Ghost tag teks (tiap HP liat namanya sendiri)
${prefix}ghostpp - Ghost tag foto profil (tiap HP liat fotonya sendiri)

owner
${prefix}self   - Set bot mode self
${prefix}public - Set bot mode public${global.enableEval ? `\n${prefix}run    - Eval kode JS ke bot` : ''}${global.enableShellExec ? `\n$<perintah>     - Jalanin perintah terminal/shell` : ''}`;

  await m.reply(teks);
};

handler.command = ['menu'];
export default handler;