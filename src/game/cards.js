import config from '../config.js';

class Cards {
    constructor(playerCount) {
        this.playerCount = playerCount;
        this.cards = this.generateDeck();
        this.shuffle();
    }

    generateDeck() {
        const totalCards = config.CARDS_PER_PLAYER * this.playerCount;
        const deck = [];
        
        for (let i = 0; i < totalCards; i++) {
            const randomType = config.CARD_TYPES[
                Math.floor(Math.random() * config.CARD_TYPES.length)
            ];
            deck.push(randomType);
        }
        
        return deck;
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    dealCards(count) {
        return this.cards.splice(0, count);
    }
}

export default Cards;