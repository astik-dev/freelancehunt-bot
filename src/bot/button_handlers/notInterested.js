import { timeLog } from '../../utils/timeLog.js';


export function notInterested(projectMessage) {
    bot.deleteMessage(botChatId, projectMessage);
    timeLog("Project marked as 'Not Interested', project message deleted");
}