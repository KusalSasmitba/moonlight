const { cmd } = require('../lib/command');
const fetch = require("node-fetch");

cmd(
  {
    pattern: "ytvideo ?(.*)",
    fromMe: false,
    desc: "Download YouTube video (MP4)",
    type: "media",
    filename: __filename,
  },
  async (m, match) => {
    if (!match) return m.reply("📥 Send a video name or YouTube link!");

    try {
      const res = await fetch(`https://vihangayt.me/tools/ytplay?query=${encodeURIComponent(match)}`);
      const data = await res.json();

      if (!data.status || !data.data || !data.data.video) {
        return m.reply("❌ Video not found.");
      }

      if (data.data.duration.includes("hour")) {
        return m.reply("⚠️ Video too long. Try a shorter one.");
      }

      await m.reply(`🎬 Title: ${data.data.title}\n⏱️ Duration: ${data.data.duration}\n\n⬇️ Sending video...`);

      await m.client.sendMessage(m.jid, {
        video: { url: data.data.video },
        caption: data.data.title,
      }, { quoted: m });

    } catch (e) {
      console.error(e);
      m.reply("❌ Error while downloading video.");
    }
  }
);
