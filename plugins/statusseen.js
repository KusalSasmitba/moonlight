const { cmd } = require('../lib/command');

cmd(
  {
    pattern: "statusseen",
    fromMe: true,
    desc: "Ghost view all WhatsApp statuses",
    type: "whatsapp",
    filename: __filename
  },
  async (m) => {
    try {
      const statusJids = Object.keys(await m.client.statusV3Jid());

      if (statusJids.length === 0) {
        return m.reply("😶 No statuses found.");
      }

      let count = 0;
      for (const jid of statusJids) {
        try {
          await m.client.chatRead(jid, "unread");
          count++;
        } catch (err) {
          console.log(`❌ Failed to read status: ${jid}`, err);
        }
      }

      return m.reply(`✅ Viewed ${count} statuses silently 👀`);
    } catch (e) {
      console.error(e);
      return m.reply("⚠️ Error while ghost viewing statuses.");
    }
  }
);
