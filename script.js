import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { config } from "./config.js";



const lastProjectIdFile = "last-project-id.json";
let lastProjectId = fs.existsSync(lastProjectIdFile) ? Number(fs.readFileSync(lastProjectIdFile, 'utf-8')) : undefined;

const bot = new TelegramBot(config.telegram.token, {polling: true});



function createProjectMessage(project) {
    let message = "";
    message += `<a href="${project.links.self.web}">${project.attributes.name}</a>\n`;
    message += project.attributes.budget ? "💵 "+project.attributes.budget.amount+" "+project.attributes.budget.currency+"\n" : "";
    message += "\n";
    message += project.attributes.description;
    return message;
}

function timeLog(message) {
    console.log(`${new Date().toLocaleTimeString()} | ${message}`);
}

function fetchFreelancehunt() {

    timeLog("Fetch");
    
    fetch(`https://api.freelancehunt.com/v2/projects?filter[skill_id]=${config.freelancehunt.skillIds}`, {
        headers: {
            'Authorization': config.freelancehunt.token,
        }
    })
        .then(response => response.json())
        .then(response => {
            
            const projects = response.data;
            const newLastProjectId = response.data[0].id;

            if (!lastProjectId)
                lastProjectId = response.data[response.data.length - 1].id - 1;

            projects.forEach(project => {

                if (project.id > lastProjectId) {
                    
                    const message = createProjectMessage(project);
                    
                    bot.sendMessage(config.telegram.chatId, message, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    });

                    timeLog(`New project: ${project.attributes.name}`);
                }
            });

            fs.writeFileSync(lastProjectIdFile, `${newLastProjectId}`);
            lastProjectId = newLastProjectId;
        })
        .catch(error => timeLog(`Error: ${error}`));
}



fetchFreelancehunt();

setInterval(() => {
    fetchFreelancehunt();
}, 3 * 60 * 1000);
