class Players {
    constructor() {
        this.players = [];
    }

    add(player) {
        if (this.players.some(p => p.id === player.id)) {
            return false;
        }
        
        this.players.push({
            id: player.id,
            first_name: player.first_name || 'Ismsiz',
            username: player.username,
            cards: []
        });
        return true;
    }


    remove(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }

    count() {
        return this.players.length;
    }

    get list() {
        return [...this.players];
    }
}

module.exports = Players;