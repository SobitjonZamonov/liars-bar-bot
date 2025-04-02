const players = {}; // O'yinchilarni saqlash uchun oddiy obyekt
const MAX_PLAYERS = 5; // Bu config.js dan import qilinishi kerak

export function addPlayer(chatId, user) {
    const chatIdStr = String(chatId)
    if (!players[chatId]) {
        players[chatId] = [];
    }
    
    // Foydalanuvchi allaqachon mavjudligini tekshirish
    const existingPlayer = players[chatId].find(p => p.id === user.id);
    if (existingPlayer) {
        return false;
    }
    
    // O'yinchi limitini tekshirish
    if (players[chatId].length >= MAX_PLAYERS) {
        return false;
    }
    
    players[chatId].push(user);
    return true;
}

export function getPlayers(chatId) {
    return players[String(chatId)] || []; // <-- string ga convert
}

export function clearPlayers(chatId) {
    delete players[String(chatId)]; // <-- string ga convert
}