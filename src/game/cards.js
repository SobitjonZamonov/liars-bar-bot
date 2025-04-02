const CARD_TYPES = ["ace", "king", "joker"];
const CARDS_PER_PLAYER = 5;

export function dealCards(players) {
    const playerCards = {};
    const cardsNeeded = players.length * CARDS_PER_PLAYER;
    let allCards = [];
    
    // Har bir kartadan yetarli miqdorda yaratamiz
    while (allCards.length < cardsNeeded) {
        allCards = [...allCards, ...CARD_TYPES];
    }
    
    // Kartalarni aralashtirib olamiz
    allCards = shuffleCards(allCards).slice(0, cardsNeeded);

    // Har bir o'yinchiga 5 tadan karta beramiz
    players.forEach((player, index) => {
        const start = index * CARDS_PER_PLAYER;
        playerCards[player.id] = allCards.slice(start, start + CARDS_PER_PLAYER);
    });

    return playerCards;
}

function shuffleCards(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

export function pickRandomCard() {
    return CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
}