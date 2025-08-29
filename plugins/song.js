const { cmd } = require('../lib/command');
const fetch = require("node-fetch");

cmd(
  {
    pattern: "song ?(.*)",
    fromMe: false,
    desc: "Download MP3 from YouTube",
    type: "media",
    filename: __filename,
  },
  async (m, match) => {
    if (!match) return m.reply("🎧 Please provide a song name!");

    try {
      const res = await fetch(`https://vihangayt.me/tools/ytplay?query=${encodeURIComponent(match)}`);
      const data = await res.json();

      if (!data.status || !data.data || !data.data.audio) {
        return m.reply("❌ Song not found.");
      }

      await m.reply(`🎵 Title: ${data.data.title}\n⏱️ Duration: ${data.data.duration}\n\n⬇️ Sending audio...`);

      await m.client.sendMessage(m.jid, {
        audio: { url: data.data.audio },
        mimetype: "audio/mp4"
      }, { quoted: m });
    } catch (e) {
      console.error(e);
      m.reply("⚠️ Error occurred while downloading the song.");
    }
  }
);
