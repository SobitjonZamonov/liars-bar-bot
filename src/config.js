
import dotenv from "dotenv";
dotenv.config();

// BOT_TOKEN .env faylidan olinadi
export const BOT_TOKEN = process.env.BOT_TOKEN || "7031706588:AAFl03fLYZkWzSujcJACI-IaRJ3bx0bqbrc"; // .env faylidan o'qish

export const GAME_TIMEOUT = parseInt(process.env.GAME_TIMEOUT) || 10000;
export const READY_TIMEOUT = 30000;
export const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS) || 5;
export const MIN_PLAYERS = parseInt(process.env.MIN_PLAYERS) || 2;
export const ALL_CARDS = ["ace", "king", "joker"];

// Agar BOT_TOKEN topilmasa, dastur to‘xtatiladi
if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN topilmadi! .env faylini tekshiring.");
    process.exit(1);
}