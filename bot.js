import TelegramBot from 'node-telegram-bot-api';

import { config } from "./src/config.js";
import { addBid } from './src/bot/button_handlers/addBid.js';
import { bidAnalysis } from './src/bot/button_handlers/bidAnalysis.js';
import { notInterested } from './src/bot/button_handlers/notInterested.js';
import { checkForNewProjects } from './src/checkForNewProjects.js';



global.bot = new TelegramBot(config.telegram.token, {polling: true});
global.botChatId = config.telegram.chatId;

global.canCheckForNewProjects = true;



bot.on("callback_query", (callbackQuery) => {

    const [command, data] = callbackQuery.data.split(':');
    const projectMessage = callbackQuery.message.message_id;

    if (command == "add_bid") {
        const [projectId, projectCurrency] = data.split(',');
        addBid(projectId, projectCurrency, projectMessage);
    } else if (command == "bid_analysis") {
        const projectId = data;
        bidAnalysis(projectId, projectMessage);
    } else if (command == "not_interested") {
        notInterested(projectMessage);
    }
});



checkForNewProjects();

setInterval(() => {
    if (canCheckForNewProjects) {
        checkForNewProjects();
    }
}, 3 * 60 * 1000);
