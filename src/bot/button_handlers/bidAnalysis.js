import { fetchFreelancehuntJSON } from '../../fetchFreelancehuntJSON.js';
import { getMinMaxAvg } from '../../utils/getMinMaxAvg.js';
import { generateOccurrencesString } from '../../utils/generateOccurrencesString.js';
import { timeLog } from '../../utils/timeLog.js';


export async function bidAnalysis(projectId, projectMessageId) {
    const responseJSON = await fetchFreelancehuntJSON(`https://api.freelancehunt.com/v2/projects/${projectId}/bids`);
    const allBids = responseJSON.data;
    const unhiddenBids = allBids.filter(bid => !bid.attributes.is_hidden);

    let message =  "<b>📊 Bid analysis</b>\n";
        message += `\n`;
        message += `<b><i>Bids:</i></b> ${allBids.length}\n`;
        message += `<b><i>Unhidden bids:</i></b> ${unhiddenBids.length}`;

    if (allBids.length != 0 && unhiddenBids.length != 0) {
        
        const bidCurrency = unhiddenBids[0].attributes.budget.currency;

        const bidAmounts = unhiddenBids.map(bid => bid.attributes.budget.amount);
        const bidAmount = getMinMaxAvg(bidAmounts);
        const bidAmountsOccurrences = generateOccurrencesString(bidAmounts);

        const bidDays = unhiddenBids.map(bid => bid.attributes.days);
        const projectDuration = getMinMaxAvg(bidDays);
        const bidDaysOccurrences = generateOccurrencesString(bidDays);

        message += `\n\n`;
        message += `<b>💵 <u>Price</u></b>\n`
        message += `<b>MAX:</b> ${bidAmount.max} ${bidCurrency}\n`;
        message += `<b>AVG:</b> ${bidAmount.avg} ${bidCurrency}\n`;
        message += `<b>MIN:</b> ${bidAmount.min} ${bidCurrency}\n`;
        message += `<b>Occurrences:</b> ${bidAmountsOccurrences}\n`;
        message += `\n`;
        message += `<b>⌛ <u>Project duration</u></b>\n`
        message += `<b>MAX:</b> ${projectDuration.max} days\n`;
        message += `<b>AVG:</b> ${projectDuration.avg} days\n`;
        message += `<b>MIN:</b> ${projectDuration.min} days\n`;
        message += `<b>Occurrences:</b> ${bidDaysOccurrences}`;
    }

    await bot.sendMessage(
        botChatId,
        message,
        {
            parse_mode: 'HTML',
            reply_to_message_id: projectMessageId,
        }
    );

    timeLog(`Bid analysis`);
}