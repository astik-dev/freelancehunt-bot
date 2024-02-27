import { config } from "./config.js";


export async function fetchFreelancehuntJSON(link) {

    const response = await fetch(link, {
        headers: {
            'Authorization': config.freelancehunt.token,
        }
    });

    return response.json();
}