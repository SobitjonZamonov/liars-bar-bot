import { dealCards } from "./cards.js";
import { getPlayers, clearPlayers } from "./players.js";
import { Markup } from "telegraf";
import { pickRandomCard } from "./cards.js";


export const games = new Map();

export function startGame(chatId, bot) {
    const players = getPlayers(chatId);
    if (players.length < MIN_PLAYERS) {
        bot.telegram.sendMessage(chatId, "❌ O'yin boshlash uchun yetarli o'yinchi yo'q!");
        return;
    }

    const game = {
        players,
        playerCards: dealCards(players),
        currentCard: pickRandomCard(),
        currentPlayerIndex: Math.floor(Math.random() * players.length),
        lastPlayedCard: null,
        lastPlayerId: null
    };

    games.set(String(chatId), game);

    // Guruhga xabar
    bot.telegram.sendMessage(
        chatId,
        `🎮 *Liars Bar o'yini boshlandi!*\n\n` +
        `Birinchi karta: *${currentCard}*\n` +
        `Birinchi o'yinchi: ${players[currentPlayerIndex].name}`,
        { parse_mode: "Markdown" }
    );

    sendCardsToPlayers(players, playerCards, bot);
    askPlayerMove(chatId, bot);
}

function selectRandomCard() {
    const cards = ["ace", "king", "joker"];
    return cards[Math.floor(Math.random() * cards.length)];
}

function sendCardsToPlayers(players, playerCards, bot) {
    players.forEach(player => {
        const cardsText = playerCards[player.id]
            .map((card, index) => `${index + 1}. ${card.toUpperCase()}`)
            .join("\n");

        bot.telegram.sendMessage(
            player.id,
            `🃏 *Sizning kartalaringiz:*\n${cardsText}\n\n` +
            `Navbat sizga kelganda quyidagi tugmalar paydo bo'ladi:`,
            {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("🎴 Karta tashlash", `playCard_${player.id}`)],
                    [Markup.button.callback("🤥 LIAR! (Yolg'on deyish)", `liar_${player.id}`)]
                ])
            }
        ).catch(e => console.error(`Xabar yuborishda xato (${player.id}):`, e));
    });
}

export function askPlayerMove(chatId, bot) {
    const game = games.get(chatId);
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];

    // Guruhga kimning navbatligi haqida xabar
    bot.telegram.sendMessage(
        chatId,
        `⏳ Navbat: *${currentPlayer.name}*`,
        { parse_mode: "Markdown" }
    );

    // O'yinchiga shaxsiy xabar
    bot.telegram.sendMessage(
        currentPlayer.id,
        `🔄 *Sizning navbatingiz!*\n` +
        `Joriy karta: ${game.currentCard}\n` +
        `Oxirgi tashlangan karta: ${game.lastPlayedCard || "Hali tashlanmadi"}`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("🎴 Karta tashlash", `playCard_${currentPlayer.id}`)],
                [Markup.button.callback("🤥 LIAR! (Yolg'on deyish)", `liar_${currentPlayer.id}`)]
            ])
        }
    ).catch(e => {
        console.error(`Navbat xabarini yuborishda xato (${currentPlayer.id}):`, e);
        // Agar xabar yuborishda xato bo'lsa, navbatni keyingi o'yinchiga o'tkazish
        nextPlayer(chatId, bot);
    });
}

export function handleCardPlay(ctx) {
    const userId = ctx.match[1];
    const chatId = ctx.chat.id;
    const game = games.get(chatId);

    if (!game) {
        return ctx.answerCbQuery("❌ O'yin topilmadi");
    }

    if (game.players[game.currentPlayerIndex].id != userId) {
        return ctx.answerCbQuery("⏳ Hali sizning navbatingiz emas!");
    }

    const availableCards = game.playerCards[userId];
    if (!availableCards || availableCards.length === 0) {
        return ctx.answerCbQuery("⚠️ Sizda tashlash uchun kartalar qolmadi!");
    }

    ctx.reply(
        `🃏 *Qaysi kartani tashlamoqchisiz?*\nJoriy karta: ${game.currentCard}`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard(
                availableCards.map(card =>
                    [Markup.button.callback(card.toUpperCase(), `dropCard_${userId}_${card}`)]
                )
            )
        }
    );
}

export function handleDropCard(ctx) {
    const [userId, playedCard] = ctx.match.slice(1);
    const chatId = ctx.chat.id;
    const game = games.get(chatId);

    if (!game || game.players[game.currentPlayerIndex].id != userId) {
        return ctx.answerCbQuery("⚠️ Noto'g'ri amal!");
    }

    // Kartani o'chirish
    game.playerCards[userId] = game.playerCards[userId].filter(card => card !== playedCard);
    game.lastPlayedCard = playedCard;
    game.lastPlayerId = userId;

    // Guruhga xabar
    ctx.telegram.sendMessage(
        chatId,
        `🎴 ${ctx.from.first_name} kartani tashladi: ${getCardEmoji(playedCard)} *${playedCard.toUpperCase()}*`,
        { parse_mode: "Markdown" }
    );

    // Navbatni keyingi o'yinchiga o'tkazish
    nextPlayer(chatId, ctx.telegram);
}

export function handleLiarCall(ctx) {
    const userId = ctx.match[1];
    const chatId = ctx.chat.id;
    const game = games.get(chatId);

    if (!game || !game.lastPlayerId) {
        return ctx.answerCbQuery("⚠️ Hali hech kim karta tashlamadi!");
    }

    const lastPlayer = game.players.find(p => p.id === game.lastPlayerId);
    const isLiar = (game.lastPlayedCard.toLowerCase() !== game.currentCard.toLowerCase());

    // Guruhga natija
    ctx.telegram.sendMessage(
        chatId,
        `🕵️‍♂️ *${ctx.from.first_name} ${lastPlayer.name}ni yolg'onchi deb atadi!*\n\n` +
        `Tashlangan karta: *${game.lastPlayedCard.toUpperCase()}*\n` +
        `Kerak bo'lgan karta: *${game.currentCard.toUpperCase()}*\n\n` +
        `Natija: ${isLiar ? "YOLG'ON! 😈" : "TO'G'RI! ✅"}\n\n` +
        `${isLiar ? lastPlayer.name : ctx.from.first_name} o'yindan chiqdi!`,
        { parse_mode: "Markdown" }
    );

    // O'yinchilarni olib tashlash
    if (isLiar) {
        removePlayer(chatId, game.lastPlayerId);
    } else {
        removePlayer(chatId, userId);
    }

    // Agar 1 ta o'yinchi qolsa
    if (game.players.length === 1) {
        endGame(chatId, game.players[0].id, ctx.telegram);
        return;
    }

    // Yangi karta tanlash
    game.currentCard = selectRandomCard();
    game.currentPlayerIndex = game.players.findIndex(p => p.id === (isLiar ? userId : game.lastPlayerId));
    askPlayerMove(chatId, ctx.telegram);
}

function nextPlayer(chatId, bot) {
    const game = games.get(chatId);
    if (!game) return;

    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    askPlayerMove(chatId, bot);
}

function removePlayer(chatId, playerId) {
    const game = games.get(chatId);
    if (!game) return;

    game.players = game.players.filter(p => p.id !== playerId);
    delete game.playerCards[playerId];

    // Agar o'yinchi navbatdagi bo'lsa, navbatni tuzatish
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    game.currentPlayerIndex = game.players.findIndex(p => p.id === game.players[game.currentPlayerIndex]?.id);
    if (game.currentPlayerIndex === -1) game.currentPlayerIndex = 0;
}

function endGame(chatId, winnerId, bot) {
    const game = games.get(chatId);
    if (!game) return;

    const winner = game.players.find(p => p.id === winnerId);
    bot.sendMessage(
        chatId,
        `🎉 *${winner ? winner.name : "Noma'lum"} g'olib bo'ldi!* 🏆\n\n` +
        `O'yin yakunlandi. Yangi o'yin boshlash uchun /play buyrug'ini yuboring.`,
        { parse_mode: "Markdown" }
    );

    games.delete(chatId);
    clearPlayers(chatId);
}