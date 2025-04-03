require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const GameManager = require('./game/gameManager');
const { startCommand } = require('./commands/start');
const { playCommand } = require('./commands/play');
const { gameRules } = require ('./utils/helpers.js')

const token = "7031706588:AAFQQ6x399nOgLMNe72nVFqlXBb7SF-aYXw"
const bot = new TelegramBot(token, { polling: true });

const gameManager = new GameManager(bot);

bot.onText(/\/start/, (msg) => startCommand(bot, msg));
bot.onText(/\/play/, (msg) => playCommand(bot, msg, gameManager));

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, gameRules);
})

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;
    const user = callbackQuery.from;

    console.log(`Callback from ${user.id}: ${data}`);

    try {
        if (data === 'join_game') {
            await gameManager.addPlayer(chatId, user);
            await bot.answerCallbackQuery(callbackQuery.id, { text: "O'yiniga qo'shildingiz!" });
        }
        else if (data.startsWith('select_card_')) {
            const cardIndex = parseInt(data.split('_')[2]);
            await gameManager.playCard(user.id, cardIndex);
            await bot.answerCallbackQuery(callbackQuery.id);
        }
        else if (data === 'call_liar') {
            const chatId = gameManager.playerChatMap.get(user.id);
            if (chatId) {
                await gameManager.handleLiarCall(chatId, user.id);
                await bot.answerCallbackQuery(callbackQuery.id);
            }
        }
        else if (data === 'confirm_start') {
            await gameManager.confirmGameStart(chatId);
            await bot.answerCallbackQuery(callbackQuery.id);
        }
        else if (data === 'liar_call') {
            await gameManager.handleLiarCall(chatId, user.id);
            await bot.answerCallbackQuery(callbackQuery.id);
        }
        else if (data === 'cancel_game') {
            await gameManager.cancelGame(chatId);
            await bot.answerCallbackQuery(callbackQuery.id, { text: "O'yin bekor qilindi" });
        }
        else if (data.startsWith('play_card_')) {
            const cardIndex = parseInt(data.split('_')[2]);
            await gameManager.playCard(chatId, user.id, cardIndex);
            await bot.answerCallbackQuery(callbackQuery.id);
        }

    } catch (error) {
        console.error('Callback error:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Xatolik: ' + error.message,
            show_alert: true
        });
    }
});

console.log('✅ Bot ishga tushdi...');