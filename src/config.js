export default {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 5,
  JOIN_TIMEOUT: 10000, // 10 seconds
  CONFIRMATION_TIMEOUT: 10000, // 10 seconds
  CARDS_PER_PLAYER: 5,
  DEFAULT_CHANCES: 3,
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