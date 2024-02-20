import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { config } from "./config.js";



const lastProjectTimeFile = "last-project-time.txt";
let lastProjectTime = fs.existsSync(lastProjectTimeFile) ? new Date(fs.readFileSync(lastProjectTimeFile, 'utf-8')) : new Date();

const bot = new TelegramBot(config.telegram.token, {polling: true});



function createProjectMessage(project) {
    let message = "";
    message += `<b>${project.attributes.name}</b>\n`;
    message += project.attributes.budget ? "💵 "+project.attributes.budget.amount+" "+project.attributes.budget.currency+"\n" : "";
    message += "\n";
    message += project.attributes.description;
    message += "\n\n";
    message += project.attributes.published_at;
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
        timeLog("Fetch");
        
        const responseJSON = await fetchFreelancehuntJSON(`https://api.freelancehunt.com/v2/projects?filter[skill_id]=${config.freelancehunt.skillIds}`);

        const newProjects = await getNewProjects(responseJSON);

        for (let i = newProjects.length - 1; i >= 0; i--) {

            const project = newProjects[i];

            bot.sendMessage(
                config.telegram.chatId,
                createProjectMessage(project),
                {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: 'Open on Freelancehunt', url: project.links.self.web }
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



checkForNewProjects();

setInterval(() => {
    checkForNewProjects();
}, 3 * 60 * 1000);
