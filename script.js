import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { config } from "./config.js";



const oldProjectIdsFile = "oldProjectIds.json";
let oldProjectIds = fs.existsSync(oldProjectIdsFile) ? JSON.parse(fs.readFileSync(oldProjectIdsFile, 'utf-8')) : {};
let newProjectIds = {};

const bot = new TelegramBot(config.telegram.token, {polling: true});



function isNewProject(project) {
    newProjectIds[project.id] = 1;
    return oldProjectIds[project.id] != 1;
}

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
            
            projects.forEach(project => {
                
                if (isNewProject(project)) {
                    
                    const message = createProjectMessage(project);
                    
                    bot.sendMessage(config.telegram.chatId, message, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    });

                    timeLog(`New project: ${project.attributes.name}`);
                }
            });

            fs.writeFileSync(oldProjectIdsFile, JSON.stringify(newProjectIds));
            oldProjectIds = newProjectIds;
            newProjectIds = {};
        })
        .catch(error => timeLog(`Error: ${error}`));
}



fetchFreelancehunt();

setInterval(() => {
    fetchFreelancehunt();
}, 3 * 60 * 1000);
