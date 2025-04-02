import { Markup } from "telegraf";
import { addPlayer, getPlayers, clearPlayers } from "../game/players.js";
import { startGame, games, askPlayerMove } from "../game/gameManager.js";
import { GAME_TIMEOUT, MIN_PLAYERS, MAX_PLAYERS } from "../config.js";

const activeGames = new Map();

export function registerPlayCommand(bot) {
    bot.command("play", async (ctx) => {
        const chatId = String(ctx.chat.id); // Har doim string formatda saqlaymiz

        // O'yin allaqachon boshlanda bo'lsa
        if (activeGames.has(chatId) || games.has(chatId)) {
            return ctx.reply("⚠️ Bu guruhda allaqachon o'yin boshlandi!");
        }

        clearPlayers(chatId);

        try {
            const message = await ctx.reply(
                `🎲 Liar's Bar o'yini boshlanmoqda!\n` +
                `Qo'shilish uchun pastdagi tugmani bosing.\n` +
                `Minimum: ${MIN_PLAYERS} o'yinchi, Maksimum: ${MAX_PLAYERS} o'yinchi.`,
                Markup.inlineKeyboard([
                    Markup.button.callback("➕ Qo'shilish", `join_${chatId}`)
                ])
            );

            activeGames.set(chatId, {
                joinTimeout: null,
                readyTimeout: null,
                messageId: message.message_id // Xabarni yangilash uchun ID
            });

            // 60 soniya davomida qo'shilish
            const joinTimeout = setTimeout(async () => {
                const gameData = activeGames.get(chatId);
                if (!gameData) return;

                const players = getPlayers(chatId);
                if (players.length < MIN_PLAYERS) {
                    await ctx.reply("❌ O'yinchilar yetarli emas. O'yin bekor qilindi.");
                    clearPlayers(chatId);
                    activeGames.delete(chatId);
                    return;
                }

                try {
                    await ctx.telegram.editMessageText(
                        chatId,
                        gameData.messageId,
                        null,
                        `✅ ${players.length} ta o'yinchi qo'shildi!\n` +
                        `O'yinchilar: ${players.map(p => p.name).join(", ")}\n\n` +
                        `O'yinni boshlash uchun "✅ Boshlash" tugmasini bosing.`,
                        Markup.inlineKeyboard([
                            [Markup.button.callback("✅ Boshlash", `start_${chatId}`)],
                            [Markup.button.callback("❌ Bekor qilish", `cancel_${chatId}`)]
                        ])
                    );

                    // 30 soniya boshlash uchun
                    gameData.readyTimeout = setTimeout(() => {
                        if (activeGames.has(chatId)) {
                            ctx.reply("🕒 O'yin boshlash vaqti tugadi. O'yin bekor qilindi.");
                            clearPlayers(chatId);
                            activeGames.delete(chatId);
                        }
                    }, 30000);

                } catch (error) {
                    console.error("Xabarni yangilashda xato:", error);
                }
            }, 60000);

            activeGames.get(chatId).joinTimeout = joinTimeout;

        } catch (error) {
            console.error("Play command error:", error);
            activeGames.delete(chatId);
        }
    });

    // Qo'shilish tugmasi uchun handler
    bot.action(/join_(.+)/, async (ctx) => {
        const chatId = ctx.match[1];
        const gameData = activeGames.get(chatId);

        if (!gameData) {
            return ctx.answerCbQuery("⚠️ O'yin topilmadi yoki qo'shilish vaqti tugadi!", { show_alert: true });
        }

        const user = {
            id: ctx.from.id,
            name: ctx.from.first_name || ctx.from.username
        };

        try {
            if (addPlayer(chatId, user)) {
                await ctx.answerCbQuery(`✅ ${user.name} o'yinga qo'shildi!`);

                const players = getPlayers(chatId);
                await ctx.telegram.editMessageText(
                    chatId,
                    gameData.messageId,
                    null,
                    `🎲 Liar's Bar o'yini boshlanmoqda!\n` +
                    `Qo'shilganlar: ${players.length}/${MAX_PLAYERS}\n` +
                    `O'yinchilar: ${players.map(p => p.name).join(", ")}`,
                    Markup.inlineKeyboard([
                        Markup.button.callback("➕ Qo'shilish", `join_${chatId}`)
                    ])
                );
            } else {
                await ctx.answerCbQuery("⚠️ Siz allaqachon qo'shilgansiz yoki limit to'ldi!");
            }
        } catch (error) {
            console.error("Qo'shilishda xato:", error);
            await ctx.answerCbQuery("⚠️ Xatolik yuz berdi. Iltimos, qayta urunib ko'ring.");
        }
    });

    // O'yinni boshlash tugmasi
    bot.action(/start_(.+)/, async (ctx) => {
        const chatId = ctx.match[1];
        const gameData = activeGames.get(chatId);

        if (!gameData) {
            return ctx.answerCbQuery("⚠️ O'yin topilmadi!");
        }

        clearTimeout(gameData.joinTimeout);
        clearTimeout(gameData.readyTimeout);
        startGame(chatId, ctx.telegram);
        activeGames.delete(chatId);
    });

    // Bekor qilish tugmasi
    bot.action(/cancel_(.+)/, async (ctx) => {
        const chatId = ctx.match[1];
        const gameData = activeGames.get(chatId);

        if (gameData) {
            clearTimeout(gameData.joinTimeout);
            clearTimeout(gameData.readyTimeout);
            activeGames.delete(chatId);
        }

        clearPlayers(chatId);
        await ctx.reply("🚫 O'yin bekor qilindi.");
    });

    // Karta o'ynash handlerlari
    bot.action(/playCard_(.+)/, async (ctx) => {
        const userId = ctx.match[1];
        const chatId = String(ctx.chat.id);
        const game = games.get(chatId);

        if (!game) return ctx.answerCbQuery("❌ O'yin topilmadi.");
        if (game.players[game.currentPlayerIndex].id != userId) {
            return ctx.answerCbQuery("⏳ Hali sizning navbatingiz emas!");
        }

        const playerCards = game.playerCards[userId];
        await ctx.reply(
            `🃏 ${ctx.from.first_name}, qaysi kartani tashlamoqchisiz?`,
            Markup.inlineKeyboard(
                playerCards.map(card => [Markup.button.callback(card.toUpperCase(), `dropCard_${userId}_${card}`)])
            )
        );
    });

    bot.action(/dropCard_(.+)_(.+)/, async (ctx) => {
        const userId = ctx.match[1];
        const playedCard = ctx.match[2];
        const chatId = String(ctx.chat.id);
        const game = games.get(chatId);

        if (!game) return ctx.answerCbQuery("❌ O'yin topilmadi.");
        if (game.players[game.currentPlayerIndex].id != userId) {
            return ctx.answerCbQuery("⏳ Hali sizning navbatingiz emas!");
        }

        // Kartani olib tashlash
        game.playerCards[userId] = game.playerCards[userId].filter(card => card !== playedCard);
        game.lastPlayedCard = playedCard;

        await ctx.reply(`🎴 ${ctx.from.first_name} kartani tashladi: ${playedCard.toUpperCase()}`);

        // Navbatni keyingi o'yinchiga o'tkazish
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        askPlayerMove(chatId, ctx.telegram);
    });
}