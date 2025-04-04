import config from '../config.js';
import Players from './players.js';
import Cards from './cards.js';
import { v4 as uuidv4 } from 'uuid';

class GameManager {
    constructor(bot) {
        this.bot = bot;
        this.waitingGames = new Map();
        this.activeGames = new Map();
        this.lastJoinMessageId = null;
        this.playerChatMap = new Map();
    }

    // O'yinni boshlash
    async startGame(chatId) {
        if (this.waitingGames.has(chatId)) {
            await this.bot.sendMessage(chatId, '⚠️ O\'yin allaqachon boshlangan!');
            return;
        }

        const newGame = {
            players: new Players(),
            timer: null,
            state: 'WAITING_FOR_PLAYERS',
            chatId: chatId
        };

        this.waitingGames.set(chatId, newGame);

        const joinMessage = await this.bot.sendMessage(
            chatId,
            '🎮 Liars Bar o\'yini boshlanmoqda!\n' +
            `Qo'shilish uchun 10 soniya vaqt bor.\n` +
            `Minimum ${config.MIN_PLAYERS} ta, maksimum ${config.MAX_PLAYERS} ta o'yinchi kerak.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Qo\'shilish', callback_data: 'join_game' }]
                    ]
                }
            }
        );

        this.lastJoinMessageId = joinMessage.message_id;

        const timer = setTimeout(async () => {
            const game = this.waitingGames.get(chatId);
            if (!game) return;

            let count = 5;
            const interval = setInterval(() => {
                this.bot.sendMessage(chatId, `--${count}--`);
                count--;

                if (count === 0) {
                    clearInterval(interval);

                    if (game.players.count() < config.MIN_PLAYERS) {
                        this.bot.sendMessage(
                            chatId,
                            `❌ O'yinchilar yetarli emas (${game.players.count()}/${config.MAX_PLAYERS}). O'yin bekor qilindi.`
                        );
                        this.waitingGames.delete(chatId);
                    } else {
                        this.confirmGameStart(chatId);
                    }
                }
            }, 1000);
        }, config.JOIN_TIMEOUT - 5000);

        newGame.timer = timer;
    }

    // O'yinchi qo'shish
    async addPlayer(chatId, user) {
        const game = this.waitingGames.get(chatId);
        if (!game || game.state !== 'WAITING_FOR_PLAYERS') return false;

        const added = game.players.add(user);
        if (added) {
            this.playerChatMap.set(user.id, chatId);
            await this.bot.sendMessage(
                chatId,
                `🎉 ${user.first_name} o'yiniga qo'shildi!\n` +
                `o'yinchilar: (${game.players.count()}/${config.MAX_PLAYERS})`,
                { reply_to_message_id: this.lastJoinMessageId }
            );
            return true;
        }
        return false;
    }

    // O'yinni boshlashni tasdiqlash
    async confirmGameStart(chatId) {
        const game = this.waitingGames.get(chatId);
        if (!game) return;

        clearTimeout(game.timer);
        game.state = 'CONFIRMATION';

        const playerList = game.players.list.map(p => `👉 ${p.first_name}`).join('\n');

        await this.bot.sendMessage(
            chatId,
            `🎉 O'yin boshlanishi uchun tayyor!\n\n` +
            `O'yinchilar:` +
            `\n${playerList}\n\n` +
            `O'yinni boshlaymizmi?`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Ha, boshlaymiz!', callback_data: `confirm_start_${chatId}` }],
                        [{ text: '❌ Bekor qilish', callback_data: `cancel_game_${chatId}` }]
                    ]
                }
            }
        );

        this.bot.on('callback_query', async (query) => {
            const { data, message } = query;
            if (!message || message.chat.id !== chatId) return;

            if (data === `confirm_start_${chatId}`) {
                await this.beginGame(chatId);
            } else if (data === `cancel_game_${chatId}`) {
                this.bot.sendMessage(chatId, `❌ O'yin bekor qilindi.`);
            }

            await this.bot.answerCallbackQuery(query.id);
        });
    }

    // O'yinni boshlash
    async beginGame(chatId) {
        const waitingGame = this.waitingGames.get(chatId);
        if (!waitingGame) return;

        const deck = new Cards(waitingGame.players.count());
        const players = waitingGame.players.list.map(player => ({
            ...player,
            cards: deck.dealCards(config.CARDS_PER_PLAYER)
        }));

        const gameState = {
            id: uuidv4(),
            players: {
                list: players,
                currentIndex: Math.floor(Math.random() * players.length)
            },
            currentCardType: config.CARD_TYPES[Math.floor(Math.random() * config.CARD_TYPES.length)],
            deck: deck,
            status: 'IN_PROGRESS',
            lastPlayedCard: null
        };

        this.activeGames.set(chatId, gameState);
        this.waitingGames.delete(chatId);

        // Har bir o'yinchiga shaxsiy kartalarni yuborish
        for (const player of gameState.players.list) {
            await this.sendPrivateCards(player, gameState.currentCardType);
        }

        // O'yin boshlandi xabari
        const currentPlayer = gameState.players.list[gameState.players.currentIndex];
        await this.bot.sendMessage(
            chatId,
            `🎴 O'yin boshlandi!\n\n` +
            `Tanlangan karta turi: ${gameState.currentCardType}\n` +
            `Birinchi o'yinchi: ${currentPlayer.first_name}\n\n` +
            `Har bir o'yinchiga ${config.CARDS_PER_PLAYER} ta karta berildi.`
        );

        await this.promptPlayer(chatId);
    }

    // Shaxsiy kartalarni yuborish
    async sendPrivateCards(player, currentCardType) {
        const cardList = player.cards.map((card, index) =>
            `${index + 1}. ${card.toUpperCase()}`).join('\n');

        await this.bot.sendMessage(
            player.id,
            `📋 Sizning kartalaringiz:\n${cardList}\n\n` +
            `Tanlangan karta turi: ${currentCardType}`
        );
    }

    // O'yinchiga navbat berish
    async promptPlayer(chatId) {
        const game = this.activeGames.get(chatId);
        if (!game || game.status !== 'IN_PROGRESS') return;

        const currentPlayer = game.players.list[game.players.currentIndex];
        const nextPlayerIndex = (game.players.currentIndex + 1) % game.players.list.length;
        const nextPlayer = game.players.list[nextPlayerIndex];

        await this.bot.sendMessage(
            chatId,
            `👤 *${currentPlayer.first_name}*, navbat sizda! ` +
            `Kartangizni shaxsiy xabarda tanlang.\n\n` +
            `🔜 Keyingi o'yinchi: *${nextPlayer.first_name}*`
        );

        // Shaxsiy chatga kartalarni yuborish
        await this.promptCardSelection(currentPlayer.id, currentPlayer.cards, game.currentCardType);
    }

    // Karta tanlash uchun shaxsiy keyboard
    // Karta tanlash uchun shaxsiy keyboard
    async promptCardSelection(userId, cards, currentCardType) {
        if (!cards.length) {
            return await this.bot.sendMessage(userId, "Sizda hech qanday karta yo'q.");
        }

        const cardButtons = cards.map((_, index) => ({
            text: `Karta ${index + 1}`,
            callback_data: `select_card_${index}`
        }));

        await this.bot.sendMessage(
            userId,
            `🃏 *Kartalaringizni tanlang* (${currentCardType} deb atash kerak):`,
            {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: [cardButtons] } // Tugmalar bitta qatorda
            }
        );
    }


    // Karta o'ynash
    async playCard(userId, cardIndex) {
        const chatId = this.playerChatMap.get(userId);
        if (!chatId) return;

        const game = this.activeGames.get(chatId);
        if (!game || game.status !== 'IN_PROGRESS') return;

        const playerIndex = game.players.list.findIndex(p => p.id === userId);
        if (playerIndex === -1) return;

        // Agar foydalanuvchi hozirgi o'yinchi bo'lmasa, xabar yuborish va funksiya tugatish
        if (game.players.currentIndex !== playerIndex) {
            return await this.bot.sendMessage(userId, "❌ Sizning navbatingiz emas! Kuting.");
        }

        const player = game.players.list[playerIndex];

        // Karta indeksi noto'g'ri bo'lsa
        if (cardIndex < 0 || cardIndex >= player.cards.length) {
            return await this.bot.sendMessage(userId, "❌ Noto‘g‘ri karta tanlandi.");
        }

        const playedCard = player.cards.splice(cardIndex, 1)[0];
        game.lastPlayedCard = playedCard;

        // Guruhga xabar
        await this.bot.sendMessage(
            chatId,
            `🃏 ${player.first_name} karta tashladi!`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🤥 LIAR deb atash', callback_data: 'liar_call' }]
                    ]
                }
            }
        );

        // Keyingi o'yinchiga navbat
        game.players.currentIndex = (game.players.currentIndex + 1) % game.players.list.length;
        await this.promptPlayer(chatId);
    }

    // "Liar" deb chaqirish
    async handleLiarCall(chatId, userId) {
        const game = this.activeGames.get(chatId);
        if (!game || game.status !== 'IN_PROGRESS') return;

        const currentPlayer = game.players.list[game.players.currentIndex];
        const previousIndex = (game.players.currentIndex - 1 + game.players.list.length) % game.players.list.length;
        const previousPlayer = game.players.list[previousIndex]; // Oldingi o‘yinchi
        const liarPlayer = game.players.list.find(p => p.id === userId); // "Liar" chaqirgan o‘yinchi

        if (liarPlayer.id !== currentPlayer.id) {
            // O'yinchi o'z kartasiga "Liar" deb chaqira olmaydi
            return await this.bot.sendMessage(chatId, `⚠️ Siz o'zingizning kartangizga "Liar" deb chaqira olmaysiz!`);
        }

        await this.bot.sendMessage(
            chatId,
            `⚠️ ${liarPlayer.first_name} "Liar" deb chaqirdi! 🃏 Tashlangan karta: ${game.lastPlayedCard}`
        );

        // Kim noto'g'ri ishlagan?
        if (game.lastPlayedCard === game.currentCardType) {
            liarPlayer.chances = (liarPlayer.chances || config.DEFAULT_CHANCES) - 1; // Shans kamayadi
            await this.bot.sendMessage(
                chatId,
                `❌ ${liarPlayer.first_name} noto'g'ri chaqirdi! Qolgan shanslari: ${liarPlayer.chances}/${config.DEFAULT_CHANCES}`
            );

            if (liarPlayer.chances === 0) {
                await this.bot.sendMessage(chatId, `💀 ${liarPlayer.first_name} o'yindan chiqdi!`);
                game.players.list = game.players.list.filter(p => p.id !== liarPlayer.id);
            }
        } else {
            previousPlayer.chances = (previousPlayer.chances || config.DEFAULT_CHANCES) - 1; // Shans kamayadi
            await this.bot.sendMessage(
                chatId,
                `🔥 ${previousPlayer.first_name} bluff qilgan edi! Qolgan shanslari: ${previousPlayer.chances}/${config.DEFAULT_CHANCES}`
            );

            if (previousPlayer.chances === 0) {
                await this.bot.sendMessage(chatId, `💀 ${previousPlayer.first_name} o'yindan chiqdi!`);
                game.players.list = game.players.list.filter(p => p.id !== previousPlayer.id);
            }
        }

        // Agar kimdadir kartalar qolmasa, u g'olib deb e'lon qilinadi
        for (const player of game.players.list) {
            if (player.cards.length === 0) {
                await this.bot.sendMessage(
                    chatId,
                    `🎉 ${player.first_name} barcha kartalarini tashladi va G'OLIB bo'ldi!`
                );
                this.activeGames.delete(chatId);
                return;
            }
        }

        // O'yinda faqat 1 ta o'yinchi qolsa, u g'olib
        if (game.players.list.length === 1) {
            await this.bot.sendMessage(
                chatId,
                `🏆 O'yin tugadi! G'olib: ${game.players.list[0].first_name}`
            );
            this.activeGames.delete(chatId);
        } else {
            await this.startNewRound(chatId);
        }
    }

    // Yangi raund boshlash
    async startNewRound(chatId) {
        const game = this.activeGames.get(chatId);
        if (!game) return;

        game.currentCardType = config.CARD_TYPES[Math.floor(Math.random() * config.CARD_TYPES.length)];

        game.players.currentIndex = Math.floor(Math.random() * game.players.list.length);

        await this.bot.sendMessage(
            chatId,
            `🔄 Yangi raund! Tanlangan karta turi: ${game.currentCardType}\n` +
            `Birinchi o'yinchi: ${game.players.list[game.players.currentIndex].first_name}`
        );

        // Yangi raund uchun o'yinchiga navbat berish
        await this.promptPlayer(chatId);
    }

    // O'yinni bekor qilish
    async cancelGame(chatId) {
        const game = this.waitingGames.get(chatId);
        if (!game) return;

        clearTimeout(game.timer);
        this.waitingGames.delete(chatId);
        await this.bot.sendMessage(chatId, '❌ O\'yin bekor qilindi.');
    }
}

export default GameManager;