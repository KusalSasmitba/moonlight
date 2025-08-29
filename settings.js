//==================== MOONLIGHT MD BOT SETTINGS ====================

const fs = require('fs');

// Load environment variables if config.env exists
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

// Function to convert string to boolean
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    // ================= SESSION =================
    // SESSION_ID empty leave කරන්න, bot run වෙද්දි QR scan කරලා auto generate වෙනවා
    SESSION_ID: process.env.SESSION_ID === undefined ? '' : process.env.SESSION_ID,

    // ================= PREFIX =================
    // Bot command prefix (උදා: .help / !ping)
    PREFIX: process.env.PREFIX || '.',

    // ================= OWNER =================
    // Bot owner / SUDO number (ඔයාගේ main WhatsApp number)
    SUDO: process.env.SUDO === undefined ? '94752425527' : process.env.SUDO,

    // ================= MODE =================
    // Bot mode: public / inbox / groups
    MODE: process.env.MODE === undefined ? "public" : process.env.MODE,

    // ================= AUTO STATUS READ =================
    // true → Status messages auto read වෙනවා, false → auto read නැහැ
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS === undefined ? "true" : process.env.AUTO_READ_STATUS
};

//==================================================================
