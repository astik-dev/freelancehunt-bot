import fs from 'fs';

import { config } from "./config.js";
import { sendProjectMessage } from "./bot/sendProjectMessage.js";
import { fetchFreelancehuntJSON } from "./fetchFreelancehuntJSON.js";
import { delay } from "./utils/delay.js";
import { timeLog } from "./utils/timeLog.js";



const lastProjectTimeFile = "last-project-time.txt";
let lastProjectTime = fs.existsSync(lastProjectTimeFile) ? new Date(fs.readFileSync(lastProjectTimeFile, 'utf-8')) : new Date();



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



export async function checkForNewProjects() {
    
    try {
        timeLog("Checking for new projects");
        
        const responseJSON = await fetchFreelancehuntJSON(`https://api.freelancehunt.com/v2/projects?filter[skill_id]=${config.freelancehunt.skillIds}`);

        const newProjects = await getNewProjects(responseJSON);

        for (let i = newProjects.length - 1; i >= 0; i--) {
            const project = newProjects[i];
            sendProjectMessage(project);
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