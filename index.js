const {
    default: makeWASocket,
    getAggregateVotesInPollMessage, 
    useMultiFileAuthState,
    DisconnectReason,
    getDevice,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    getContentType,
    Browsers,
    makeInMemoryStore,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto
} = require('@whiskeysockets/baileys')

const { 
  getBuffer, 
  getGroupAdmins, 
  getRandom, 
  h2k, 
  isUrl, 
  Json, 
  runtime, 
  sleep, 
  fetchJson 
} = require('./lib/functions')

const fs = require('fs')
const P = require('pino')
const FileType = require('file-type')
const path = require('path')
const qrcode = require('qrcode-terminal')
const NodeCache = require('node-cache')
const util = require('util')
const { sms, downloadMediaMessage } = require('./lib/msg')
const axios = require('axios')
const { File } = require('megajs')
const { exec } = require('child_process');
const { tmpdir } = require('os')
const Crypto = require('crypto')
const Jimp = require('jimp')
const express = require("express");

const app = express();
const port = process.env.PORT || 8000;

var config = require('./settings')
var prefix = config.PREFIX
var prefixRegex = config.prefix === "false" || config.prefix === "null" ? "^" : new RegExp('^[' + config.PREFIX + ']');
const msgRetryCounterCache = new NodeCache()

// Bot owner number
const ownerNumber = ['94752425527'];

//================== SESSION ==================
if (!fs.existsSync(__dirname + '/session/creds.json')) {
    if (config.SESSION_ID) {
        const sessdata = config.SESSION_ID.replace("KSMD~", "")
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`)
        filer.download((err, data) => {
            if (err) throw err
            fs.writeFile(__dirname + '/session/creds.json', data, () => {
                console.log("Session download completed !!")
            })
        }) 
    }
}

//================== Connect to WA ==================
async function connectToWA() {
    console.log("Connecting MOONLIGHT MD...");
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/session/')
    const conn = makeWASocket({
        logger: P({ level: "fatal" }).child({ level: "fatal" }),
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
        auth: state,
        defaultQueryTimeoutMs: undefined,
        msgRetryCounterCache
    })

    //================== Connection Update ==================
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                connectToWA()
            }
        } else if (connection === 'open') {
            console.log('Installing plugins...')
            fs.readdirSync("./plugins/").forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() === ".js") {
                    require("./plugins/" + plugin);
                }
            });
            console.log('MOONLIGHT MD Plugins installed ✅')
            console.log('MOONLIGHT MD Bot connected ✅')

            //================== CONNECT MG ==================
            const mode = config.MODE
            const statusRead = config.AUTO_READ_STATUS

            let up = "*🫧 MOONLIGHT MD BOT CONNECTED SUCCESSFULLY ☑️*\n\n𝙿𝚁𝙴𝙵𝙸𝚇 :- " + prefix + "\n𝙼𝙾𝙳𝙴 :- " + mode + "\n𝚂𝚃𝙰𝚃𝚄𝚂 𝚁𝙴𝙰𝙳 :- " + statusRead + "\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ MOONLIGHT MD";

            conn.sendMessage(conn.user.id, { text: up, contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402220977044@newsletter',
                    newsletterName: "<| MOONLIGHT MD V❷🫧",
                    serverMessageId: 999
                },
                externalAdReply: { 
                    title: 'MOONLIGHT MD',
                    body: 'MOONLIGHT MD',
                    mediaType: 1,
                    thumbnailUrl: "https://imgur.com/a/jgZN1dp",
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }})
        }
    })

    conn.ev.on('creds.update', saveCreds)

    //================== Message Handler ==================
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            mek = mek.messages[0]
            if (!mek.message) return
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message

            //================== Auto Status View ==================
            if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true"){
                await conn.readMessages([mek.key])  
                const mnyako = await jidNormalizedUser(conn.user.id)
                await conn.sendMessage(mek.key.remoteJid, { react: { key: mek.key, text: '🧡'}}, { statusJidList: [mek.key.participant, mnyako] })
            }      

            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            const m = sms(conn, mek)
            const type = getContentType(mek.message)
            const from = mek.key.remoteJid

            const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []

            const body = (type === 'conversation') ? mek.message.conversation 
                        : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text 
                        : (type == 'interactiveResponseMessage') ? mek.message.interactiveResponseMessage.nativeFlowResponseMessage && JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id 
                        : (type == 'templateButtonReplyMessage') ? mek.message.templateButtonReplyMessage.selectedId 
                        : (type === 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption 
                        : (type === 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption 
                        : ''

            const isCmd = body.startsWith(prefix)       
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = body.trim().split(/ +/).slice(1)
            const q = args.join(' ')
            const isGroup = from.endsWith('@g.us')
            const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
            const senderNumber = sender.split('@')[0]
            const botNumber = conn.user.id.split(':')[0]
            const pushname = 'MOONLIGHT MD'
            const isOwner = ownerNumber.includes(senderNumber)

            //================== Reply Helper ==================
            const reply = async(teks) => {
                return await conn.sendMessage(from, { text: teks }, { quoted: mek })
            }

            //================== Command Handling ==================
            const events = require('./lib/command')
            const cmdName = isCmd ? command : false;
            if (isCmd) {
                const cmd = events.commands.find((cmd) => cmd.pattern === cmdName) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName))
                if (cmd) {
                    if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } })
                    try {
                        cmd.function(conn, mek, m, { from, prefix, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber, pushname, isOwner, reply });
                    } catch (e) {
                        console.error("[PLUGIN ERROR] ", e);
                    }
                }
            }

        } catch (e) {
            console.log(String(e))
        }
    })
}

//================== Express Server ==================
app.get("/", (req, res) => {
    res.send("MOONLIGHT MD CONNECTED SUCCESSFULY...💀");
});
app.listen(port, () => console.log(`MOONLIGHT MD Server listening on port http://localhost:` + port));

setTimeout(() => {
    connectToWA()
}, 3000);
