async function startCommand(bot, msg) {
    await bot.sendMessage(
      msg.chat.id,
      `Salom! Bu "Liars Bar" o'yini boti. O'ynash uchun /play buyrug'ini yuboring.`
    );

    await bot.sendMessage (
      msg.chat.id,
      `oyin haqida batfsil /help bolimiga o'ting`
    )
  }
  
  module.exports = { startCommand };