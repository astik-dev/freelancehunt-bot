import { fetchFreelancehuntJSON } from "../fetchFreelancehuntJSON.js";


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



export async function sendProjectMessage(project) {
    return bot.sendMessage(
        botChatId,
        await createProjectMessage(project),
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `👷 Employer`, url: `https://freelancehunt.com/employer/${project.attributes.employer.login}.html` },
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
}