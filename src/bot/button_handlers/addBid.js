import { sendMessageAndWaitForResponse } from "../utils/sendMessageAndWaitForResponse.js";
import { timeLog } from '../../utils/timeLog.js';
import { config } from "../../config.js";


export async function addBid(projectId, projectCurrency, projectMessageId) {

    canCheckForNewProjects = false;

    const bid = {
        "days": null,
        "safe_type": "employer",
        "budget": {
            "amount": null,
            "currency": projectCurrency
        },
        "comment": null,
        "is_hidden": true
    };

    await bot.sendMessage(
        botChatId,
        `📝 Adding a bid for the project:`,
        {
            disable_web_page_preview: true,
            reply_to_message_id: projectMessageId,
        }
    );

    bid.comment = await sendMessageAndWaitForResponse(`Send a commentary`);
    bid.budget.amount = await sendMessageAndWaitForResponse(`Send a price (${projectCurrency})`);
    bid.days = await sendMessageAndWaitForResponse(`Send a project duration`);

    let bidMessage =  `<b>💬 Commentary:</b>\n<blockquote>${bid.comment}</blockquote>\n`;
        bidMessage += `<b>💵 Price:</b> ${bid.budget.amount} ${projectCurrency}\n`;
        bidMessage += `<b>🕔 Project duration:</b> ${bid.days} days`;

    await bot.sendMessage(
        botChatId,
        bidMessage,
        {
            disable_web_page_preview: true,
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['❌ Cancel', '✅ Add'],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        }
    );
    const bidConfirmation = await sendMessageAndWaitForResponse("Confirm adding bid");
    
    let bidResultMessage;

    if (bidConfirmation == "✅ Add") {
        try {
            const bidResponse = await fetch(`https://api.freelancehunt.com/v2/projects/${projectId}/bids`, {
                method: 'POST',    
                headers: {
                    "Authorization": config.freelancehunt.token,
                    "Content-Type": "application/json",
                },
                body: bid
            });

            if (!bidResponse.ok) {
                throw new Error(`HTTP error! Status: ${bidResponse.status}`);
            } else {    
                bidResultMessage = "✅ Bid successfully added";
                timeLog("Bid successfully added");
            }
        } catch (error) {
            timeLog(`Bid error: ${error}`);
            bidResultMessage = `❌ Bid error: ${error}`;
        }
    } else {
        if (bidConfirmation != "❌ Cancel") {
            await bot.sendMessage(botChatId, `<b>❌ Unknown command</b>`, { parse_mode: 'HTML' });
        }
        bidResultMessage = "❌ Bid addition canceled";
        timeLog("Bid addition canceled");
    }

    await bot.sendMessage(
        botChatId,
        `<b>${bidResultMessage}</b>`, 
        {
            parse_mode: 'HTML',
            reply_markup: {
                remove_keyboard: true,
            },
        }
    );

    canCheckForNewProjects = true;
}