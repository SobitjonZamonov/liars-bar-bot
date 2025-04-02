const playersByChat = new Map();

export function addPlayer(chatId, user) {
    const chatIdStr = String(chatId);
    if (!playersByChat.has(chatIdStr)) {
        playersByChat.set(chatIdStr, []);
    }
    
    const players = playersByChat.get(chatIdStr);
    if (players.some(p => p.id === user.id)) return false;
    
    players.push({
        id: user.id,
        name: user.first_name || user.username,
        username: user.username // Yangi qo'shilgan qism
    });
    return true;
}

export function getPlayers(chatId) {
    return playersByChat.get(String(chatId)) || [];
}

export function clearPlayers(chatId) {
    playersByChat.delete(String(chatId));
}