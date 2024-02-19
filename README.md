# Freelancehunt Bot

To initiate the Freelancehunt bot and start receiving notifications on new projects in Telegram, it is necessary to create a config.js file that includes access tokens, chat IDs, and skill IDs.

Example of the `config.js` file:
```javascript
export const config = {
    telegram: {
        token: "YOUR_TELEGRAM_BOT_TOKEN",
        chatId: "YOUR_TELEGRAM_CHAT_ID",
    },
    freelancehunt: {
        token: "Bearer YOUR_FREELANCEHUNT_TOKEN",
        skillIds: "YOUR_SKILL_IDS", // 28,174,1
    },
};
```