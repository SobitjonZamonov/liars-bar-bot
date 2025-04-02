import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "./config.js";
import { registerPlayCommand } from "./commands/play.js";
import { handleCardPlay, handleDropCard, handleLiarCall } from "./game/gameManager.js";

// Global bot instance
let botInstance = null;

function initializeBot() {
    try {
        const bot = new Telegraf(BOT_TOKEN);
        botInstance = bot;

        // Xatoliklar bilan ishlash
        bot.catch((err, ctx) => {
            console.error(`[ERROR] Chat ${ctx.chat?.id}:`, err);
            try {
                ctx.reply("⚠️ Botda xatolik yuz berdi. Iltimos, qayta urunib ko'ring.")
                    .catch(e => console.error("Xabar yuborishda xato:", e));
            } catch (e) {
                console.error("Reply yuborishda xato:", e);
            }
        });

        // Start komandasi
        bot.start((ctx) => {
            ctx.replyWithMarkdown("🎮 *Liar's Bar o'yin botiga xush kelibsiz!*\n\n" +
                "O'yinni boshlash uchun guruhga `/play` buyrug'ini yuboring.");
        });

        // Help komandasi
        bot.help((ctx) => {
            ctx.replyWithMarkdown(
                "📖 *Yordam:*\n\n" +
                "1. Guruhga `/play` yuborib o'yinni boshlang\n" +
                "2. O'yinchilar 'Qo'shilish' tugmasini bosishadi\n" +
                "3. Yetarli o'yinchi qo'shilgach, o'yin boshlanadi\n\n" +
                "📌 *Qoidalar:*\n" +
                "- Har bir o'yinchi 5 ta karta oladi\n" +
                "- Navbat bilan kartalaringizni tashlaysiz\n" +
                "- Agar shubhalansangiz, 'LIAR!' tugmasini bosing"
            );
        });

        // Komandalarni ro'yxatdan o'tkazish
        registerPlayCommand(bot);
        bot.action(/playCard_(.+)/, handleCardPlay);
        bot.action(/dropCard_(.+)_(.+)/, handleDropCard);
        bot.action(/liar_(.+)/, handleLiarCall);

        // Ishga tushirish
        if (process.env.WEBHOOK_MODE === 'true') {
            const webhookUrl = `${process.env.WEBHOOK_URL}/bot${BOT_TOKEN}`;
            bot.telegram.setWebhook(webhookUrl);
            bot.startWebhook(`/bot${BOT_TOKEN}`, null, process.env.PORT || 3000);
            console.log(`🌐 Webhook rejimida ishga tushdi: ${webhookUrl}`);
        } else {
            bot.launch().then(() => {
                console.log("🚀 Bot polling rejimida ishga tushdi");
            }).catch(err => {
                console.error("❌ Botni ishga tushirishda xato:", err);
            });
        }

        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            console.log(`🛑 ${signal} signal received. Bot to'xtatilmoqda...`);
            botInstance?.stop();
            process.exit(0);
        };

        process.once('SIGINT', gracefulShutdown);
        process.once('SIGTERM', gracefulShutdown);

        return bot;
    } catch (err) {
        console.error("❌ Botni ishga tushirishda kritik xato:", err);
        process.exit(1);
    }
}

// Botni ishga tushirish va eksport qilish
export const bot = initializeBot();