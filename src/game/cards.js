const CARD_TYPES = ["ace", "king", "joker"];
const CARDS_PER_PLAYER = 5;

export function dealCards(players) {
    const playerCards = {};
    const cardsPerType = Math.ceil((players.length * CARDS_PER_PLAYER) / CARD_TYPES.length);

    let allCards = [];
    CARD_TYPES.forEach(card => {
        allCards = allCards.concat(Array(cardsPerType).fill(card));
    });

    allCards = shuffleCards(allCards).slice(0, players.length * CARDS_PER_PLAYER);

    players.forEach((player, index) => {
        const start = index * CARDS_PER_PLAYER;
        playerCards[player.id] = allCards.slice(start, start + CARDS_PER_PLAYER);
    });

    return playerCards;
}

const CARD_EMOJIS = {
    ace: "🃏",
    king: "👑",
    joker: "🃏"
};

export function getCardEmoji(card) {
    return CARD_EMOJIS[card.toLowerCase()] || "🃏";
}

export function pickRandomCard() {
    return CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
}

function shuffleCards(cards) {
    const result = [...cards];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}