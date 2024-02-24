import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { config } from "./config.js";



const lastProjectTimeFile = "last-project-time.txt";
let lastProjectTime = fs.existsSync(lastProjectTimeFile) ? new Date(fs.readFileSync(lastProjectTimeFile, 'utf-8')) : new Date();

const bot = new TelegramBot(config.telegram.token, {polling: true});

let canCheckForNewProjects = true;



async function createProjectMessage(project) {
    
    const projectBudget = project.attributes.budget ? 
        `\n💵 ${project.attributes.budget.amount} ${project.attributes.budget.currency}\n` : ``;
    
    let projectSkills = "";
    project.attributes.skills.forEach((skill) => {
        projectSkills += `#${skill.name.replace(/\s/g, '_')} `;
    });

    let projectDescription = project.attributes.description.slice(0, 3700);
    if (project.attributes.description.length == 3700) projectDescription += " [...]";

    const projectEmployerJSON = await fetchFreelancehuntJSON(`https://api.freelancehunt.com/v2/employers/${project.attributes.employer.id}`);
    const projectEmployer = projectEmployerJSON.data.attributes;

    const projectPublishedAt = new Date(project.attributes.published_at);
    const projectTime = projectPublishedAt.toLocaleTimeString();
    const projectDate = projectPublishedAt.toLocaleDateString();
    
    let message = `<b>💼 ${project.attributes.name}</b>\n`;
        message += projectBudget;
        message += "\n";
        message += "🛠️ "+projectSkills+"\n";
        message += "\n";
        message += "<blockquote>"+projectDescription+"</blockquote>\n";
        message += `<code>`
        message += `👷 ${projectEmployer.first_name} ${projectEmployer.last_name} (${projectEmployer.login})\n`;
        message += `⭐️ ${projectEmployer.rating} 👍 ${projectEmployer.positive_reviews} 👎 ${projectEmployer.negative_reviews} ⚖️ ${projectEmployer.arbitrages}\n`;
        message += `🌐 ${projectEmployer.location.country.name}`;
        message += `</code>\n`;
        message += "\n";
        message += "📅 "+projectDate+" | "+projectTime;
    
    return message;
}

function timeLog(message) {
    console.log(`${new Date().toLocaleTimeString()} | ${message}`);
}

async function getNewProjects(response, newProjects) {

    if (!newProjects) newProjects = [];

    const projects = response.data;
    let nextPageNeeded = true;

    projects.forEach(project => {
        const currentProjectTime = new Date(project.attributes.published_at);
        if (currentProjectTime > lastProjectTime) {
            newProjects.push(project);
        } else {
            nextPageNeeded = false;
        }
    });

    if (nextPageNeeded) {
        await delay(1000);
        const nextPageResponse = await fetchFreelancehuntJSON(response.links.next);
        return getNewProjects(nextPageResponse, newProjects);
    } else {
        return newProjects;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFreelancehuntJSON(link) {

    const response = await fetch(link, {
        headers: {
            'Authorization': config.freelancehunt.token,
        }
    });

    return response.json();
}

async function checkForNewProjects() {
    
    try {
        timeLog("Checking for new projects");
        
        const responseJSON = await fetchFreelancehuntJSON(`https://api.freelancehunt.com/v2/projects?filter[skill_id]=${config.freelancehunt.skillIds}`);

        const newProjects = await getNewProjects(responseJSON);

        for (let i = newProjects.length - 1; i >= 0; i--) {

            const project = newProjects[i];
            const projectEmployerLogin = project.attributes.employer.login;

            bot.sendMessage(
                config.telegram.chatId,
                await createProjectMessage(project),
                {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `👷 Employer`, url: `https://freelancehunt.com/employer/${projectEmployerLogin}.html` },
                                { text: '💼 Project', url: project.links.self.web }
                            ],
                            [
                                { text: `📝 Add Bid`, callback_data: `add_bid:${project.id},${project.attributes?.budget?.currency || "UAH"}` },
                                { text: `📊 Bid Analysis`, callback_data: `bid_analysis:${project.id}` }
                            ],
                            [
                                { text: `👎 Not Interested`, callback_data: `not_interested` }
                            ]
                        ]
                    }
                }
            );

            timeLog(`New project: ${project.attributes.name}`);

            await delay(1000);
        }

        const newLastProjectTime = responseJSON.data[0].attributes.published_at;
        fs.writeFileSync(lastProjectTimeFile, `${newLastProjectTime}`);
        lastProjectTime = new Date(newLastProjectTime);

    } catch (error) {
        timeLog(`Error: ${error}`);
    }
}

function waitUserResponse() {
    return new Promise(resolve => {
        bot.once('message', (responseMessage) => {
            resolve(responseMessage.text);
        });
    });
}

async function sendMessageAndWaitForResponse(message) {
    await bot.sendMessage(config.telegram.chatId, `<b>${message}</b>`, { parse_mode: 'HTML' });
    return await waitUserResponse();
}

async function addBid(projectId, projectCurrency, projectMessageId) {

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
        config.telegram.chatId,
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
        config.telegram.chatId,
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
            await bot.sendMessage(config.telegram.chatId, `<b>❌ Unknown command</b>`, { parse_mode: 'HTML' });
        }
        bidResultMessage = "❌ Bid addition canceled";
        timeLog("Bid addition canceled");
    }

    await bot.sendMessage(
        config.telegram.chatId,
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

function getAverage(numbers) {
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round(sum / numbers.length);
}

function getMinMaxAvg(numbers) {
    return {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: getAverage(numbers)
    }
}

function generateOccurrencesString(numbers) {
    // count occurrences
    let occurrences = {};
    numbers.forEach(number => {
        occurrences[number] = (occurrences[number] || 0) + 1;
    });
    // sort occurrences
    const sortedOccurrencesArray =  Object.entries(occurrences).sort((a, b) => b[1] - a[1]);
    // occurrences array to string
    return sortedOccurrencesArray.map(([num, count]) => `${num} (${count})`).join(', ');
}

async function bidAnalysis(projectId, projectMessageId) {
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
        config.telegram.chatId,
        message,
        {
            parse_mode: 'HTML',
            reply_to_message_id: projectMessageId,
        }
    );

    timeLog(`Bid analysis`);
}



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
        bot.deleteMessage(config.telegram.chatId, projectMessage);
        timeLog("Project marked as 'Not Interested', project message deleted");
    }
});



checkForNewProjects();

setInterval(() => {
    if (canCheckForNewProjects) {
        checkForNewProjects();
    }
}, 3 * 60 * 1000);
