// console.log('[/play] Command received', { 
//     chatId: msg.chat.id,
//     from: msg.from.id,
//     chatType: msg.chat.type
// });

// const chatId = msg.chat.id;

// try {
//     console.log('Getting bot info...');
//     const botInfo = await bot.getMe();
//     const botUserId = botInfo.id;
//     console.log('Bot ID:', botUserId);

//     console.log('Getting chat admins...');
//     const chatAdmins = await bot.getChatAdministrators(chatId);
//     console.log('Admins list:', chatAdmins.map(a => ({
//         id: a.user.id,
//         name: a.user.first_name,
//         status: a.status
//     })));

//     const isBotAdmin = chatAdmins.some(admin => 
//         admin.user.id === botUserId && 
//         admin.status === 'administrator'
//     );

//     console.log('Is bot admin?', isBotAdmin);
    
//     if (!isBotAdmin) {
//         console.log('Bot is not admin, sending message');
//         await bot.sendMessage(chatId, `Bot admin emas! Iltimos, botni admin qiling. Bot ID: ${botUserId}`);
//         return;
//     }
// }