// BOT_TOKEN .env faylidan olinadi
// export const BOT_TOKEN = process.env.BOT_TOKEN || "7031706588:AAFl03fLYZkWzSujcJACI-IaRJ3bx0bqbrc"; // .env faylidan o'qish


module.exports = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 5,
    JOIN_TIMEOUT: 10000, // 10 seconds
    CONFIRMATION_TIMEOUT: 10000, // 10 seconds
    CARDS_PER_PLAYER: 5,
    CARD_TYPES: ['ace', 'king', 'joker'],
    GAME_STATES: {
      IDLE: 'IDLE',
      WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
      CONFIRMING_START: 'CONFIRMING_START',
      IN_PROGRESS: 'IN_PROGRESS',
      ROUND_ENDED: 'ROUND_ENDED',
      GAME_ENDED: 'GAME_ENDED'
    },
    CARD_EMOJIS: {
        'ace': '🅰️',
        'king': '👑',
        'joker': '🃏'
    }
  };