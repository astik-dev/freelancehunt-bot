import { waitUserResponse } from "./waitUserResponse.js";


export async function sendMessageAndWaitForResponse(message) {
    await bot.sendMessage(botChatId, `<b>${message}</b>`, { parse_mode: 'HTML' });
    return await waitUserResponse();
}