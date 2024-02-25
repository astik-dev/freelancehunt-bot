import 'dotenv/config';

export const config = {
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
    },
    freelancehunt: {
        token: process.env.FREELANCEHUNT_TOKEN,
        skillIds: process.env.FREELANCEHUNT_SKILL_IDS,
    },
};